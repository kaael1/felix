from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class PromoData(BaseModel):
    imageUrl: str
    title: str
    description: str
    buttonText: str
    link: str
    footer: str


class TransferState(BaseModel):
    destinationCountry: Optional[str] = None
    amount: Optional[str] = None
    beneficiaryName: Optional[str] = None
    deliveryMethod: Optional[str] = None
    isComplete: bool = False


class Message(BaseModel):
    id: str
    role: Literal["user", "agent"]
    content: str
    timestamp: datetime
    promo: Optional[PromoData] = None


class AgentResponse(BaseModel):
    agentResponse: str
    updatedState: TransferState
    promo: Optional[PromoData] = None


VALID_COUNTRIES = [
    "USA",
    "Mexico",
    "India",
    "Philippines",
    "Canada",
    "UK",
    "Brazil",
    "France",
    "Germany",
    "Japan",
]

VALID_METHODS = [
    "Bank Deposit",
    "Cash Pickup",
    "Mobile Wallet",
]

COUNTRY_CURRENCY_MAP = {
    "USA": "USD",
    "Mexico": "MXN",
    "India": "INR",
    "Philippines": "PHP",
    "Canada": "CAD",
    "UK": "GBP",
    "Brazil": "BRL",
    "France": "EUR",
    "Germany": "EUR",
    "Japan": "JPY",
}


class ChatRequest(BaseModel):
    userMessage: str = Field(..., min_length=1)
    currentState: Optional[TransferState] = None
    messageHistory: list[Message] = Field(default_factory=list)


