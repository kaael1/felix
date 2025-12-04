import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TransferState, AgentResponse, Message, VALID_COUNTRIES, VALID_METHODS, COUNTRY_CURRENCY_MAP } from "../types";

const PROMO_IMAGE_URL = "https://cdn.prod.website-files.com/663002023d3d42ffa6937084/692e0e7ee90ceebca6e1077c_home-troca.avif";
const PROMO_LINK = "https://www.felixpago.com";

const SYSTEM_INSTRUCTION = `
You are a helpful, professional, and friendly Send Money Agent. 
Your goal is to collect the following information from the user to initiate a money transfer:
1. Destination Country
2. Amount (value + currency)
3. Beneficiary Name (MUST be Full Name: First + Last)
4. Delivery Method

VALIDATION DATA (Strictly enforce these):
- Supported Countries: ${VALID_COUNTRIES.join(", ")}
- Supported Delivery Methods: ${VALID_METHODS.join(", ")}
- Currency Mapping: ${JSON.stringify(COUNTRY_CURRENCY_MAP)}
- Beneficiary Name: Must consist of at least TWO words (First Name and Last Name).

LANGUAGE & LOCALIZATION:
- DETECT the user's language based on their latest input.
- ALWAYS respond in the EXACT SAME language as the user.
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

   - Image URL: "${PROMO_IMAGE_URL}" (Do not translate URL)

   - Link: "${PROMO_LINK}" (Do not translate URL)

If the transaction is NOT confirmed or NOT complete, 'promo' must be null.

- Do NOT hallucinate values.
`;

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    agentResponse: {
      type: Type.STRING,
      description: "The natural language response to the user."
    },
    updatedState: {
      type: Type.OBJECT,
      properties: {
        destinationCountry: { type: Type.STRING, nullable: true },
        amount: { type: Type.STRING, nullable: true, description: "Format: '100 USD', '500 BRL'" },
        beneficiaryName: { type: Type.STRING, nullable: true },
        deliveryMethod: { type: Type.STRING, nullable: true },
        isComplete: { type: Type.BOOLEAN, description: "True only if all 4 fields are collected and VALID (including full name check)." },
      },
      required: ["destinationCountry", "amount", "beneficiaryName", "deliveryMethod", "isComplete"],
    },
    promo: {
      type: Type.OBJECT,
      nullable: true,
      description: "Include ONLY when user CONFIRMS the final transaction.",
      properties: {
        imageUrl: { type: Type.STRING },
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        buttonText: { type: Type.STRING },
        link: { type: Type.STRING },
        footer: { type: Type.STRING },
      },
      required: ["imageUrl", "title", "description", "buttonText", "link", "footer"]
    }
  },
  required: ["agentResponse", "updatedState"],
};

export const processUserMessage = async (
  userMessage: string,
  currentState: TransferState,
  messageHistory: Message[]
): Promise<AgentResponse> => {
  try {
    // Create new instance per call to ensure fresh config/keys if environment changes
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY or API_KEY environment variable is not set");
    }
    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-2.5-flash";
    
    // Construct a context-aware prompt
    const chatHistoryText = messageHistory
      .slice(-10) // Keep last 10 turns for context window efficiency
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    const prompt = `
      Current Internal State:
      ${JSON.stringify(currentState, null, 2)}

      Conversation History:
      ${chatHistoryText}

      User's Latest Input:
      "${userMessage}"

      Based on the history and the latest input, return the JSON object with the natural language response and the updated state.
    `;

    const result = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1, // Lower temperature to strictly follow logical guardrails
      },
    });

    const text = result.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text) as AgentResponse;

  } catch (error) {
    console.error("Gemini Service Error:", error);
    // Fallback response in case of API failure
    return {
      agentResponse: "I'm having trouble connecting to the network right now. Please try again in a moment.",
      updatedState: currentState,
    };
  }
};