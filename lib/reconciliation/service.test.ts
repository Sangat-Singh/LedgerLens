import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  deleteDecisions: vi.fn(),
  deleteAudits: vi.fn(),
  resetRecords: vi.fn(),
  updateStatuses: vi.fn(),
  updateRecords: vi.fn(),
  createDecisions: vi.fn(),
  createAudits: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    financialRecord: { findMany: mocks.findMany, updateMany: mocks.updateStatuses },
    reconciliationDecision: { deleteMany: mocks.deleteDecisions, createMany: mocks.createDecisions },
    auditEvent: { deleteMany: mocks.deleteAudits, createMany: mocks.createAudits, create: mocks.createAudits },
    $transaction: mocks.transaction,
  },
}));

import { runReconciliation } from "./service";

const records = Array.from({ length: 560 }, (_, index) => ({
  id: `record-${index}`,
  referenceNumber: `INV-${index}`,
  amount: 1000,
  currency: "INR",
  date: new Date("2026-08-01"),
  type: "INVOICE" as const,
}));

describe("production-safe reconciliation persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue(records);
    mocks.deleteDecisions.mockResolvedValue({ count: 560 });
    mocks.deleteAudits.mockResolvedValue({ count: 560 });
    mocks.resetRecords.mockResolvedValue({ count: 560 });
    mocks.updateStatuses.mockResolvedValue({ count: 40 });
    mocks.updateRecords.mockImplementation(() => Promise.resolve({}));
    mocks.createDecisions.mockImplementation(() => Promise.resolve({}));
    mocks.createAudits.mockImplementation(() => Promise.resolve({}));
    mocks.transaction.mockImplementation(async (operations) => {
      expect(typeof operations).toBe("object");
      return Promise.all(operations);
    });
  });

  it("processes 560 records in short transactions and returns duration", async () => {
    const result = await runReconciliation();

    expect(result.processed).toBe(560);
    expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    expect(mocks.transaction).toHaveBeenCalledTimes(14);
    expect(mocks.transaction.mock.calls.every(([operations]) => operations.length <= 120)).toBe(true);
    expect(mocks.updateStatuses).toHaveBeenCalledTimes(43);
    expect(mocks.createDecisions).toHaveBeenCalledTimes(14);
    expect(mocks.createAudits).toHaveBeenCalledTimes(15);
  });

  it("resets prior decisions and audit events on repeat runs", async () => {
    await runReconciliation();
    await runReconciliation();

    expect(mocks.deleteDecisions).toHaveBeenCalledTimes(2);
    expect(mocks.deleteAudits).toHaveBeenCalledTimes(2);
    expect(mocks.updateStatuses).toHaveBeenCalledTimes(86);
    expect(mocks.createDecisions).toHaveBeenCalledTimes(28);
  });
});
