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
  await prisma.reconciliationDecision.deleteMany();
  await prisma.auditEvent.deleteMany({ where: { action: "RECONCILIATION_DECISION" } });
  await prisma.financialRecord.updateMany({ data: { status: RecordStatus.PENDING } });

  const batchSize = 40;
  for (let start = 0; start < records.length; start += batchSize) {
    const batch = records.slice(start, start + batchSize);
    const updates: RecordStatus[] = [];
    const decisionRows = [];
    const auditRows = [];
    for (const record of batch) {
      const result = engine.decide(record, records.filter((candidate) => candidate.id !== record.id && candidate.type !== record.type));
      const resultingStatus = statusFor(result.decision as Decision);
      updates.push(resultingStatus);
      decisionRows.push({ recordId: record.id, decision: result.decision, confidence: result.confidence, reason: result.reason, action: result.recommendedAction, previousStatus: RecordStatus.PENDING, resultingStatus });
      auditRows.push({ action: "RECONCILIATION_DECISION", recordId: record.id, reference: record.referenceNumber, result: result.decision, details: result.reason });
    }
    await prisma.$transaction([
      ...[RecordStatus.RECONCILED, RecordStatus.EXCEPTION, RecordStatus.UNRESOLVED]
        .map((status) => prisma.financialRecord.updateMany({ where: { id: { in: batch.filter((_, index) => updates[index] === status).map((record) => record.id) } }, data: { status } }))
        .filter((_, index) => updates.includes([RecordStatus.RECONCILED, RecordStatus.EXCEPTION, RecordStatus.UNRESOLVED][index])),
      prisma.reconciliationDecision.createMany({ data: decisionRows }),
      prisma.auditEvent.createMany({ data: auditRows }),
    ]);
  }
  const processingTimeMs = Math.round(performance.now() - startedAt);
  await prisma.auditEvent.create({ data: { action: "BATCH_RECONCILIATION", result: "COMPLETED", details: `Processed ${records.length} records in ${processingTimeMs}ms.` } });
  return { processed: records.length, processingTimeMs };
}
