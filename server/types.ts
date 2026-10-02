export type EvidenceStatus =
  | "Supported"
  | "Insufficient evidence"
  | "Conflicting evidence"
  | "Needs clarification";

export interface Passage {
  id: string;
  documentId: string;
  documentName: string;
  page: number;
  text: string;
  sourceUrl?: string;
  score?: number;
}

export interface ResearchDocument {
  id: string;
  name: string;
  format: string;
  sourceUrl?: string;
  addedAt: string;
  pageCount: number;
  characterCount: number;
  passages: Passage[];
}

export interface Answer {
  status: EvidenceStatus;
  answer: string;
  evidence: Passage[];
  note: string;
  model?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    estimatedUsd: number | null;
  };
}

export interface MarketPrice {
  symbol: string;
  productId: string;
  price: number;
  open24h: number | null;
  change24h: number | null;
  eventTime: string;
  receivedAt: string;
  source: "Binance Spot / USDT";
}
