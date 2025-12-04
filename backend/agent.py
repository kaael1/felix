from __future__ import annotations

import json
import logging
from typing import List, Optional
from uuid import uuid4

from google.adk.agents import LlmAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.models.llm_response import LlmResponse
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from pydantic import BaseModel

from .types import AgentResponse, ChatRequest, Message, PromoData, TransferState, VALID_COUNTRIES, VALID_METHODS, COUNTRY_CURRENCY_MAP

logger = logging.getLogger("send_money_agent")

PROMO_IMAGE_URL = "https://cdn.prod.website-files.com/663002023d3d42ffa6937084/692e0e7ee90ceebca6e1077c_home-troca.avif"
PROMO_LINK = "https://www.felixpago.com"

SYSTEM_INSTRUCTION = f"""
You are a helpful, professional, and friendly Send Money Agent.
Your goal is to collect the following information from the user to initiate a money transfer:
1. Destination Country
2. Amount (value + currency)
3. Beneficiary Name (MUST be Full Name: First + Last)
4. Delivery Method

VALIDATION DATA (Strictly enforce these):
- Supported Countries: {", ".join(VALID_COUNTRIES)}
- Supported Delivery Methods: {", ".join(VALID_METHODS)}
- Currency Mapping: {json.dumps(COUNTRY_CURRENCY_MAP)}
- Beneficiary Name: Must consist of at least TWO words (First Name and Last Name).

LANGUAGE & LOCALIZATION:
- DETECT the user's language based ONLY on their LATEST input message (the most recent user message).
- ALWAYS respond in the EXACT SAME language as the user's latest message.
- If the user writes in English (e.g., "hi", "hello", "I want to send money"), respond in English.
- If the user writes in Portuguese (e.g., "oi", "olá", "quero enviar dinheiro"), respond in Portuguese.
- Do NOT infer language from conversation history or previous messages - only use the current user message.
- If the user speaks Portuguese, the entire 'agentResponse' AND the 'promo' text (if applicable) must be in Portuguese.
- Internal State Mapping: If the user provides a value in their language (e.g., "Brasil", "Alemanha"), map it to the corresponding English value from VALIDATION DATA (e.g., "Brazil", "Germany") for the 'updatedState' JSON.

STRICT ENTITY GUARDRAILS (Crucial to prevent confusion):
1. **Name vs Country/Method**: BEFORE assigning a value to 'beneficiaryName', CHECK if that value matches a 'Supported Country' or 'Delivery Method'.
   - IF matches a Country: Update 'destinationCountry' instead, and re-ask for the Beneficiary Name.
   - IF matches a Method: Update 'deliveryMethod' instead, and re-ask for the Beneficiary Name (unless the name is already valid).
   - NEVER assign a country name (e.g., "Brazil", "France") or a method (e.g., "Bank", "Wallet") to 'beneficiaryName'.

2. **Step Jumping & Correction**:
   - Users might correct a previous field at any time. If the user says "Actually, send to France" while you are asking for the Name, update 'destinationCountry' to 'France' and re-state the context.

HANDLING AMBIGUITY & INFERENCE:
- Underspecified Beneficiary (STRICT): If the user provides only a first name (e.g., "John"), update 'beneficiaryName' to "John" BUT explicitly ask for the Last Name in your response.
  - **CRITICAL**: If the user ignores this request and provides other info, update the other info BUT **DO NOT** finalize the transaction. You MUST ask for the Last Name again.
- City Inference: If the user names a major city (e.g., "Paris", "Tokyo") instead of a country, infer the correct country if it is in the Supported Countries list.
- Currency Inference:
  - If the Destination Country is known (e.g., Brazil), and the user provides an amount without currency (e.g., "500"), INFER the correct currency from the Currency Mapping (e.g., "500 BRL").
  - If the Destination Country is NOT known, assume USD temporarily or ask the user.
- Currency Validation:
  - If the user explicitly provides a currency that DOES NOT match the destination country (e.g., "100 Euros to USA"), politely inform them of the correct currency (USD) and ask if they want to proceed with the correct currency.
- Vague Intent: If the user says "I want to send money", ask "Which country would you like to send money to?" as the first step.

VALIDATION:
- If the user specifies a country NOT in the Supported Countries list, kindly inform them which countries are supported (list 3-4 examples) and leave 'destinationCountry' as null.
- If the user specifies a method NOT in the Supported Delivery Methods list, list the available options and leave 'deliveryMethod' as null.

RESET: If the user explicitly asks to "Start Over", "Reset", or "Cancel", set all state fields to null and isComplete to false.

COMPLETION & PROMOTION:
Set 'isComplete' to true ONLY if all 4 fields are valid (full name required).
Once 'isComplete' is true, summarize the details and ask for confirmation.

**FINAL CONFIRMATION TRIGGER:**
If (and ONLY if):
1. 'isComplete' is true (or was already true).
2. The user explicitly CONFIRMS the transaction (e.g., "Yes", "Correct", "Ok", "Send").
THEN:
1. Respond with a polite closing message confirming the transaction is processing.
2. INCLUDE the 'promo' object in the JSON response.
3. TRANSLATE the promo content to the user's language based on this English Template:
   - Title: "Send money home and enter to win a Ford F-150 XL"
   - Description: "All your transfers in December of $100 or more enter the draw."
   - Button: "Send and participate now"
   - Footer: "T&Cs apply. Promotion not valid for NY and FL."
   - Image URL: "{PROMO_IMAGE_URL}" (Do not translate URL)
   - Link: "{PROMO_LINK}" (Do not translate URL)

If the transaction is NOT confirmed or NOT complete, 'promo' must be null.

- Do NOT hallucinate values.
"""


class PromptContext(BaseModel):
    user_message: str
    state: TransferState
    history: List[Message]

    def render(self) -> str:
        history_text = "\n".join(
            f"{msg.role.upper()}: {msg.content}" for msg in self.history[-10:]
        ) or "No previous messages."

        return (
            "Current Internal State:\n"
            f"{json.dumps(self.state.model_dump(), indent=2)}\n\n"
            "Conversation History:\n"
            f"{history_text}\n\n"
            "User's Latest Input:\n"
            f"\"{self.user_message}\""
        )


def create_state_update_callback():
    """Callback que atualiza session.state após o modelo LLM responder"""
    async def on_after_model_call(
        callback_context: CallbackContext,
        llm_response: LlmResponse,
    ) -> Optional[LlmResponse]:
        """
        Extrai o estado do JSON retornado pelo LLM e atualiza session.state.
        Isso permite que o ADK gerencie o estado automaticamente.
        """
        if not llm_response or not llm_response.content or not llm_response.content.parts:
            return None
        
        # Extrai o texto da resposta
        response_text = "".join(
            part.text or "" for part in llm_response.content.parts if part.text
        )
        
        try:
            # Parse do JSON retornado pelo LLM
            data = json.loads(response_text)
            agent_response_obj = AgentResponse(**data)
            
            # Atualiza session.state com o novo estado
            # Usa prefixo 'transfer:' para organizar o estado
            state_dict = agent_response_obj.updatedState.model_dump()
            for key, value in state_dict.items():
                callback_context.state[f"transfer:{key}"] = value
            
            # Salva a resposta do agente e promo (se houver)
            callback_context.state["transfer:last_response"] = agent_response_obj.agentResponse
            if agent_response_obj.promo:
                callback_context.state["transfer:promo"] = json.dumps(agent_response_obj.promo.model_dump())
            else:
                if "transfer:promo" in callback_context.state:
                    try:
                        del callback_context.state["transfer:promo"]
                    except KeyError:
                        pass
            
            # Retorna None para manter a resposta original do LLM
            return None
        except (json.JSONDecodeError, Exception) as e:
            # Se não conseguir parsear, mantém a resposta original
            logger.warning("Could not parse LLM response as JSON: %s", e, exc_info=True)
            logger.warning("Response text (first 500 chars): %s", response_text[:500])
            return None
    
    return on_after_model_call


class SendMoneyAgentService:
    def __init__(self) -> None:
        self._agent = LlmAgent(
            name="send_money_agent",
            model="gemini-2.5-flash",
            instruction=SYSTEM_INSTRUCTION,
            include_contents="none",
            output_schema=AgentResponse,
            generate_content_config=types.GenerateContentConfig(
                temperature=0.1,
                response_mime_type="application/json",
            ),
            # Callback para atualizar estado automaticamente
            after_model_callback=create_state_update_callback(),
        )
        self._app_name = "send-money-service"
        self._user_id = "web-client"
        # Cria session_service como atributo da classe para reutilização
        self._session_service = InMemorySessionService()

    async def process_message(
        self, 
        payload: ChatRequest,
        session_id: Optional[str] = None
    ) -> AgentResponse:
        """
        Processa uma mensagem do usuário.
        
        Args:
            payload: Dados da requisição
            session_id: ID da sessão (se None, cria nova sessão)
        """
        # Usa session_id fornecido ou cria novo
        if session_id is None:
            session_id = str(uuid4())
        
        # Obtém ou cria a sessão
        session = await self._session_service.get_session(
            app_name=self._app_name,
            user_id=self._user_id,
            session_id=session_id,
        )
        # Se não encontrou, cria e busca novamente
        if session is None:
            await self._session_service.create_session(
                app_name=self._app_name,
                user_id=self._user_id,
                session_id=session_id,
            )
            session = await self._session_service.get_session(
                app_name=self._app_name,
                user_id=self._user_id,
                session_id=session_id,
            )
        if session is None:
            raise RuntimeError("Could not create or retrieve session.")
        
        # Recupera estado atual de session.state (se existir)
        # O ADK é a única fonte de verdade para o estado
        current_state = TransferState(
            destinationCountry=session.state.get("transfer:destinationCountry"),
            amount=session.state.get("transfer:amount"),
            beneficiaryName=session.state.get("transfer:beneficiaryName"),
            deliveryMethod=session.state.get("transfer:deliveryMethod"),
            isComplete=session.state.get("transfer:isComplete", False),
        )
        
        # Prepara o contexto do prompt
        prompt = PromptContext(
            user_message=payload.userMessage,
            state=current_state,
            history=payload.messageHistory,
        ).render()

        content = types.Content(role="user", parts=[types.Part(text=prompt)])
        
        runner = Runner(
            agent=self._agent,
            app_name=self._app_name,
            session_service=self._session_service,
        )

        final_text: Optional[str] = None
        async for event in runner.run_async(
            user_id=self._user_id,
            session_id=session_id,
            new_message=content,
        ):
            if event.is_final_response() and event.content and event.content.parts:
                final_text = "".join(
                    part.text or "" for part in event.content.parts if part.text
                )

        if not final_text:
            raise RuntimeError("Agent did not return a final response.")

        # Parse da resposta
        try:
            data = json.loads(final_text)
            response = AgentResponse(**data)
        except Exception as e:
            print(f"Error parsing agent response: {e}")
            print(f"Response text: {final_text[:500]}")
            raise
        
        # Recupera estado atualizado de session.state (após callback)
        updated_session = await self._session_service.get_session(
            app_name=self._app_name,
            user_id=self._user_id,
            session_id=session_id,
        )
        
        # Atualiza response.updatedState com o estado do ADK
        response.updatedState = TransferState(
            destinationCountry=updated_session.state.get("transfer:destinationCountry"),
            amount=updated_session.state.get("transfer:amount"),
            beneficiaryName=updated_session.state.get("transfer:beneficiaryName"),
            deliveryMethod=updated_session.state.get("transfer:deliveryMethod"),
            isComplete=updated_session.state.get("transfer:isComplete", False),
        )
        
        # Recupera promo do estado se existir
        promo_json = updated_session.state.get("transfer:promo")
        if promo_json:
            try:
                response.promo = PromoData(**json.loads(promo_json))
            except Exception:
                pass
        
        return response


agent_service = SendMoneyAgentService()


