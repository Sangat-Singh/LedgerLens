import { PrismaClient, RecordStatus, RecordType } from "@prisma/client";

const prisma = new PrismaClient();
const baseDate = new Date("2026-08-01T00:00:00Z");

async function main() {
  console.log("Clearing existing LedgerLens data...");
  await prisma.auditEvent.deleteMany();
  await prisma.reconciliationDecision.deleteMany();
  await prisma.financialRecord.deleteMany();
  console.log("Existing data cleared.");

  const records = Array.from({ length: 560 }, (_, index) => {
    const group = Math.floor(index / 4);
    const type = [RecordType.INVOICE, RecordType.BANK_TRANSACTION, RecordType.LEDGER_ENTRY, RecordType.SETTLEMENT][index % 4];
    const issue = group % 10;
    const amount = 1_000 + (group % 25) * 250;
    const referenceNumber = issue === 8 && type === RecordType.BANK_TRANSACTION ? `BAD-${group}` : `INV-${String(group).padStart(4, "0")}`;
    const adjustedAmount = issue === 6 && type === RecordType.BANK_TRANSACTION ? amount + 100 : issue === 7 && type === RecordType.SETTLEMENT ? amount / 2 : amount;
    const dateOffset = issue === 5 && type === RecordType.LEDGER_ENTRY ? 12 : index % 3;

    return {
      referenceNumber,
      amount: adjustedAmount,
      currency: "INR",
      date: new Date(baseDate.getTime() + (group + dateOffset) * 86_400_000),
      type,
      source: type.toLowerCase(),
      status: RecordStatus.PENDING,
      groundTruth: issue < 5 ? "MATCH" : issue === 9 ? "DUPLICATE" : "EXCEPTION",
    };
  });

  console.log(`Inserting ${records.length} financial records...`);
  await prisma.financialRecord.createMany({ data: records });
  console.log(`Inserted ${records.length} financial records.`);
  const seeded = await prisma.financialRecord.findMany({ orderBy: { date: "asc" } });
  console.log(`Loaded ${seeded.length} financial records for reconciliation.`);
  const statusFor = (decision) => decision === "AUTO_RECONCILE" ? RecordStatus.RECONCILED : decision === "REVIEW" ? RecordStatus.EXCEPTION : RecordStatus.UNRESOLVED;
  const decisions = seeded.map((record) => {
    const candidates = seeded.filter((candidate) => candidate.id !== record.id && candidate.type !== record.type && candidate.referenceNumber === record.referenceNumber && candidate.currency === record.currency);
    const exact = candidates.find((candidate) => candidate.amount === record.amount && Math.abs(candidate.date - record.date) / 86400000 <= 2);
    const amountMatch = candidates.find((candidate) => candidate.amount === record.amount);
    const decision = exact ? "AUTO_RECONCILE" : candidates.length ? "REVIEW" : "UNRESOLVED";
    const confidence = exact ? 0.98 : amountMatch ? 0.68 : candidates.length ? 0.45 : 0.2;
    const reason = exact ? "Exact amount and reference match within the permitted date window." : amountMatch ? "Amount and reference match, but the transaction date is outside the permitted window." : candidates.length ? "A related reference exists, but its amount differs." : "No related record shares this reference.";
    const action = exact ? "Reconcile automatically" : amountMatch ? "Review date variance" : candidates.length ? "Review amount mismatch or partial payment" : "Investigate missing or incorrect reference";
    return { record, decision, confidence, reason, action };
  });
  const batchSize = 40;
  for (let start = 0; start < decisions.length; start += batchSize) {
    const batch = decisions.slice(start, start + batchSize);
    await prisma.$transaction(batch.flatMap(({ record, decision, confidence, reason, action }) => [
      prisma.financialRecord.update({ where: { id: record.id }, data: { status: statusFor(decision) } }),
      prisma.reconciliationDecision.create({ data: { recordId: record.id, decision, confidence, reason, action, previousStatus: RecordStatus.PENDING, resultingStatus: statusFor(decision) } }),
      prisma.auditEvent.create({ data: { action: "RECONCILIATION_DECISION", recordId: record.id, reference: record.referenceNumber, result: decision, details: reason } }),
    ]));
    console.log(`Processed reconciliation batch ${Math.floor(start / batchSize) + 1}/${Math.ceil(decisions.length / batchSize)} (${Math.min(start + batch.length, decisions.length)}/${decisions.length} records).`);
  }
  await prisma.auditEvent.create({ data: { action: "BATCH_RECONCILIATION", result: "COMPLETED", details: `Processed ${records.length} seeded records.` } });
  console.log(`Seeded ${records.length} synthetic financial records with ${decisions.length} reconciliation decisions and ${decisions.length + 1} audit events.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
