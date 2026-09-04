import type { DecisionProvider, FinancialRecordInput, ReconciliationResult } from "./types";

const daysBetween = (a: Date, b: Date) => Math.abs(a.getTime() - b.getTime()) / 86_400_000;

export class DeterministicDecisionProvider implements DecisionProvider {
  decide(record: FinancialRecordInput, candidates: FinancialRecordInput[]): ReconciliationResult {
    const sameReference = candidates.filter((c) => c.referenceNumber === record.referenceNumber && c.currency === record.currency);
    if (!sameReference.length) return { decision: "UNRESOLVED", confidence: 0.2, reason: "No related record shares this reference.", recommendedAction: "Investigate missing or incorrect reference" };
    const hasDuplicateEvidence = new Set(sameReference.map((candidate) => candidate.type)).size !== sameReference.length;
    const exact = sameReference.find((c) => c.amount === record.amount && daysBetween(c.date, record.date) <= 2);
    if (exact && hasDuplicateEvidence) return { decision: "REVIEW", confidence: 0.4, reason: "Multiple related records of the same type share this reference; duplicate evidence requires human review.", recommendedAction: "Review possible duplicate transaction before reconciliation" };
    if (exact) return { decision: "AUTO_RECONCILE", confidence: 0.98, reason: "Exact amount and reference match within the permitted date window.", recommendedAction: "Reconcile automatically" };
    const amountMatch = sameReference.find((c) => c.amount === record.amount);
    if (amountMatch) return { decision: "REVIEW", confidence: 0.68, reason: "Amount and reference match, but the transaction date is outside the permitted window.", recommendedAction: "Review date variance" };
    return { decision: "REVIEW", confidence: 0.45, reason: "A related reference exists, but its amount differs.", recommendedAction: "Review amount mismatch or partial payment" };
  }
}
