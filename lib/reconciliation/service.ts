import { Decision, RecordStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DeterministicDecisionProvider } from "./deterministic";

const statusFor = (decision: Decision) => decision === "AUTO_RECONCILE" ? RecordStatus.RECONCILED : decision === "REVIEW" ? RecordStatus.EXCEPTION : RecordStatus.UNRESOLVED;
let activeBatch: Promise<{ processed: number; processingTimeMs: number }> | null = null;

export async function runReconciliation() {
  if (activeBatch) return activeBatch;
  activeBatch = executeReconciliation();
  try { return await activeBatch; } finally { activeBatch = null; }
}

async function executeReconciliation() {
  const startedAt = performance.now();
  const records = await prisma.financialRecord.findMany({ orderBy: { date: "asc" } });
  const engine = new DeterministicDecisionProvider();
  await prisma.$transaction(async (tx) => {
    await tx.reconciliationDecision.deleteMany();
    await tx.auditEvent.deleteMany({ where: { action: "RECONCILIATION_DECISION" } });
    await tx.financialRecord.updateMany({ data: { status: RecordStatus.PENDING } });
    for (const record of records) {
      const result = engine.decide(record, records.filter((candidate) => candidate.id !== record.id && candidate.type !== record.type));
      const resultingStatus = statusFor(result.decision as Decision);
      await tx.financialRecord.update({ where: { id: record.id }, data: { status: resultingStatus } });
      await tx.reconciliationDecision.create({ data: { recordId: record.id, decision: result.decision, confidence: result.confidence, reason: result.reason, action: result.recommendedAction, previousStatus: RecordStatus.PENDING, resultingStatus } });
      await tx.auditEvent.create({ data: { action: "RECONCILIATION_DECISION", recordId: record.id, reference: record.referenceNumber, result: result.decision, details: result.reason } });
    }
    await tx.auditEvent.create({ data: { action: "BATCH_RECONCILIATION", result: "COMPLETED", details: `Processed ${records.length} records in ${Math.round(performance.now() - startedAt)}ms.` } });
  });
  return { processed: records.length, processingTimeMs: Math.round(performance.now() - startedAt) };
}
