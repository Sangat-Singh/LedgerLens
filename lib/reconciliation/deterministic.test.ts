import { describe, expect, it } from "vitest";
import { DeterministicDecisionProvider } from "./deterministic";

const record = { id: "1", referenceNumber: "INV-1", amount: 1000, currency: "INR", date: new Date("2026-08-01"), type: "INVOICE" };
describe("DeterministicDecisionProvider", () => {
  it("auto-reconciles exact, timely matches", () => expect(new DeterministicDecisionProvider().decide(record, [{ ...record, id: "2", type: "BANK_TRANSACTION" }]).decision).toBe("AUTO_RECONCILE"));
  it("never auto-reconciles amount mismatches", () => expect(new DeterministicDecisionProvider().decide(record, [{ ...record, id: "2", amount: 900 }]).decision).toBe("REVIEW"));
  it("marks absent candidates unresolved with low confidence", () => { const result = new DeterministicDecisionProvider().decide(record, []); expect(result.decision).toBe("UNRESOLVED"); expect(result.confidence).toBeLessThan(0.5); });
  it("requires review for a matching amount outside the date window", () => expect(new DeterministicDecisionProvider().decide(record, [{ ...record, id: "2", date: new Date("2026-08-10") }]).decision).toBe("REVIEW"));
  it("requires review when duplicate same-type evidence exists", () => expect(new DeterministicDecisionProvider().decide(record, [{ ...record, id: "2", type: "BANK_TRANSACTION" }, { ...record, id: "3", type: "BANK_TRANSACTION" }]).decision).toBe("REVIEW"));
  it("routes a partial-payment amount to review", () => { const result = new DeterministicDecisionProvider().decide(record, [{ ...record, id: "2", amount: 500, type: "BANK_TRANSACTION" }]); expect(result.decision).toBe("REVIEW"); expect(result.reason).toMatch(/amount differs/i); });
});
