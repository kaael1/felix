export interface TransferState {
  destinationCountry: string | null;
  amount: string | null;
  beneficiaryName: string | null;
  deliveryMethod: string | null;
  isComplete: boolean;
}

export interface PromoData {
  imageUrl: string;
  title: string;
  description: string;
  buttonText: string;
  link: string;
  footer: string;
}

export interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  promo?: PromoData; // Optional promo card data
}

export interface AgentResponse {
  agentResponse: string;
  updatedState: TransferState;
  promo?: PromoData | null; // Optional promo data from LLM
}

// Mock Validation Data
export const VALID_COUNTRIES = [
  "USA", "Mexico", "India", "Philippines", "Canada", "UK", "Brazil", "France", "Germany", "Japan"
];

export const VALID_METHODS = [
  "Bank Deposit", "Cash Pickup", "Mobile Wallet"
];

// Mapping Countries to their default currencies for validation/inference
export const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  "USA": "USD",
  "Mexico": "MXN",
  "India": "INR",
  "Philippines": "PHP",
  "Canada": "CAD",
  "UK": "GBP",
  "Brazil": "BRL",
  "France": "EUR",
  "Germany": "EUR",
  "Japan": "JPY"
};

