import { beforeEach, describe, expect, it, vi } from "vitest";
import { deterministicRecommendation, getAiRecommendation } from "./recommendation";
const context = { recordId: "r1", referenceNumber: "INV-1", amount: 1000, currency: "INR", date: new Date("2026-08-01"), source: "bank", status: "EXCEPTION", reconciliationDecision: "REVIEW", reconciliationConfidence: 0.45, reconciliationReason: "A related reference exists, but its amount differs.", candidateCount: 1, closestAmount: 800, closestDate: new Date("2026-08-01") };
describe("AI recommendation fallback", () => {
  it("returns a bounded amount-variance recommendation", () => { const result = deterministicRecommendation(context); expect(result.source).toBe("DETERMINISTIC_FALLBACK"); expect(result.riskLevel).toBe("HIGH"); expect(result.humanAction).toMatch(/do not reconcile/i); });
  it("does not fabricate an LLM response when no API key exists", async () => { const key = process.env.GEMINI_API_KEY; delete process.env.GEMINI_API_KEY; const result = await getAiRecommendation({ ...context, candidateCount: 0, closestAmount: undefined, closestDate: undefined }); expect(result.source).toBe("DETERMINISTIC_FALLBACK"); expect(result.riskLevel).toBe("HIGH"); if (key) process.env.GEMINI_API_KEY = key; });
  it("handles a zero-value partial record without unsafe numeric output", () => { const result = deterministicRecommendation({ ...context, amount: 0, closestAmount: 20 }); expect(result.riskLevel).toBe("HIGH"); expect(result.explanation).not.toContain("NaN"); });
});

vi.mock("@google/genai", () => ({ GoogleGenAI: vi.fn() }));

describe("Gemini recommendation", () => {
  beforeEach(() => { process.env.GEMINI_API_KEY = "test-key"; });

  it("returns a strictly validated Gemini recommendation", async () => {
    const { GoogleGenAI } = await import("@google/genai");
    vi.mocked(GoogleGenAI).mockImplementation(function () { return { models: { generateContent: vi.fn().mockResolvedValue({ text: JSON.stringify({ recommendation: "Review the invoice evidence.", confidence: 0.9, explanation: "The evidence supports a manual review.", riskLevel: "MEDIUM", humanAction: "Confirm the invoice before reconciling." }) }) } }; } as never);
    const result = await getAiRecommendation(context);
    expect(result).toMatchObject({ source: "LLM", recommendation: "Review the invoice evidence." });
  });

  it("falls back when Gemini returns invalid JSON", async () => {
    const { GoogleGenAI } = await import("@google/genai");
    vi.mocked(GoogleGenAI).mockImplementation(function () { return { models: { generateContent: vi.fn().mockResolvedValue({ text: "not-json" }) } }; } as never);
    const result = await getAiRecommendation(context);
    expect(result.source).toBe("DETERMINISTIC_FALLBACK");
  });

  it("falls back when Gemini rejects the request", async () => {
    const { GoogleGenAI } = await import("@google/genai");
    vi.mocked(GoogleGenAI).mockImplementation(function () { return { models: { generateContent: vi.fn().mockRejectedValue({ status: 429, code: "quota_exhausted", type: "rate_limit", message: "Quota exhausted" }) } }; } as never);
    const result = await getAiRecommendation(context);
    expect(result.source).toBe("DETERMINISTIC_FALLBACK");
  });
});
