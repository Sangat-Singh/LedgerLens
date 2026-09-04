-- CreateEnum
CREATE TYPE "RecordType" AS ENUM ('INVOICE', 'BANK_TRANSACTION', 'LEDGER_ENTRY', 'SETTLEMENT');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('PENDING', 'RECONCILED', 'EXCEPTION', 'UNRESOLVED');

-- CreateEnum
CREATE TYPE "Decision" AS ENUM ('AUTO_RECONCILE', 'REVIEW', 'UNRESOLVED');

-- CreateTable
CREATE TABLE "FinancialRecord" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "date" TIMESTAMP(3) NOT NULL,
    "type" "RecordType" NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'PENDING',
    "source" TEXT NOT NULL,
    "groundTruth" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationDecision" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "decision" "Decision" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousStatus" "RecordStatus" NOT NULL,
    "resultingStatus" "RecordStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconciliationDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "recordId" TEXT,
    "reference" TEXT,
    "result" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialRecord_referenceNumber_idx" ON "FinancialRecord"("referenceNumber");

-- CreateIndex
CREATE INDEX "FinancialRecord_status_idx" ON "FinancialRecord"("status");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "ReconciliationDecision" ADD CONSTRAINT "ReconciliationDecision_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "FinancialRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
