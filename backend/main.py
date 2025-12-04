from __future__ import annotations

import logging
import os
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .agent import agent_service
from .types import AgentResponse, ChatRequest

load_dotenv()

logger = logging.getLogger("send_money_agent")

app = FastAPI(title="Send Money Agent Service")

allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/chat")
async def chat_endpoint(
    request: ChatRequest,
    session_id: Optional[str] = Query(None, description="Session ID para manter contexto")
) -> Any:
    try:
        response: AgentResponse = await agent_service.process_message(
            request, 
            session_id=session_id
        )
        return response.model_dump()
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - logging path
        import traceback
        logger.exception("Agent processing failed: %s", exc)
        logger.error("Full traceback: %s", traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Agent processing error: {str(exc)}",
        ) from exc


