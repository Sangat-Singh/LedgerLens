import { Decision, RecordStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type MetricRow = { groundTruth: string | null; status: RecordStatus };
export function calculateEvaluation(rows: MetricRow[]) {
  const total = rows.length;
  const reconciled = rows.filter((row) => row.status === RecordStatus.RECONCILED).length;
  const exceptions = rows.filter((row) => row.status === RecordStatus.EXCEPTION).length;
  const unresolved = rows.filter((row) => row.status === RecordStatus.UNRESOLVED).length;
  const correct = rows.filter((row) => (row.groundTruth === "MATCH") === (row.status === RecordStatus.RECONCILED)).length;
  return { total, reconciled, exceptions, unresolved, correct, matchRate: total ? reconciled / total : 0, exceptionRate: total ? exceptions / total : 0, accuracy: total ? correct / total : 0 };
}

export async function getMetrics() {
  const [totalRecords, reconciled, exceptions, unresolved, amount, reconciledAmount, exceptionAmount, decisionRows, batch] = await Promise.all([
    prisma.financialRecord.count(), prisma.financialRecord.count({ where: { status: RecordStatus.RECONCILED } }),
    prisma.financialRecord.count({ where: { status: RecordStatus.EXCEPTION } }), prisma.financialRecord.count({ where: { status: RecordStatus.UNRESOLVED } }),
    prisma.financialRecord.aggregate({ _sum: { amount: true } }),
    prisma.financialRecord.aggregate({ where: { status: RecordStatus.RECONCILED }, _sum: { amount: true } }),
    prisma.financialRecord.aggregate({ where: { status: { in: [RecordStatus.EXCEPTION, RecordStatus.UNRESOLVED] } }, _sum: { amount: true } }),
    prisma.financialRecord.findMany({ select: { groundTruth: true, status: true } }),
    prisma.auditEvent.findFirst({ where: { action: "BATCH_RECONCILIATION" }, orderBy: { createdAt: "desc" } }),
  ]);
  const evaluation = calculateEvaluation(decisionRows);
  const processingTimeMs = Number(batch?.details?.match(/in (\d+)ms/)?.[1]) || null;
  return { totalRecords, reconciled, exceptions, unresolved, totalAmount: amount._sum.amount ?? 0, reconciledAmount: reconciledAmount._sum.amount ?? 0, exceptionAmount: exceptionAmount._sum.amount ?? 0, matchRate: evaluation.matchRate, exceptionRate: evaluation.exceptionRate, correct: evaluation.correct, accuracy: evaluation.accuracy, processingTimeMs, processingDetail: batch?.details ?? "Not processed yet" };
}

export async function getChartData() {
  const metrics = await getMetrics();
  return [{ name: "Reconciled", value: metrics.reconciled, color: "#12b76a" }, { name: "Exceptions", value: metrics.exceptions, color: "#f79009" }, { name: "Unresolved", value: metrics.unresolved, color: "#f04438" }];
}
