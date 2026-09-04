export type FinancialRecordInput = { id: string; referenceNumber: string; amount: number; currency: string; date: Date; type: string };
export type MatchDecision = "AUTO_RECONCILE" | "REVIEW" | "UNRESOLVED";
export type ReconciliationResult = { decision: MatchDecision; confidence: number; reason: string; recommendedAction: string };
export interface DecisionProvider { decide(record: FinancialRecordInput, candidates: FinancialRecordInput[]): ReconciliationResult; }
