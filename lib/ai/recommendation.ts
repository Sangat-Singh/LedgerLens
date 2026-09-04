import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

export type ExceptionContext = { recordId: string; referenceNumber: string; amount: number; currency: string; date: Date; source: string; status: string; reconciliationDecision: string; reconciliationConfidence: number; reconciliationReason: string; candidateCount: number; closestAmount?: number; closestDate?: Date };
export type AiRecommendation = { recommendation: string; confidence: number; explanation: string; riskLevel: "LOW" | "MEDIUM" | "HIGH"; humanAction: string; source: "LLM" | "DETERMINISTIC_FALLBACK" };

const responseSchema = z.object({ recommendation: z.string().min(3).max(280), confidence: z.number().min(0).max(1), explanation: z.string().min(3).max(1000), riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]), humanAction: z.string().min(3).max(280) });

export function deterministicRecommendation(context: ExceptionContext): AiRecommendation {
  const amountDifference = context.closestAmount === undefined ? undefined : Math.abs(context.amount - context.closestAmount);
  const dateDifference = context.closestDate === undefined ? undefined : Math.round(Math.abs(context.date.getTime() - context.closestDate.getTime()) / 86_400_000);
  if (!context.candidateCount) return { recommendation: "Investigate the missing or incorrect reference before posting a manual adjustment.", confidence: 0.84, explanation: `${context.reconciliationReason} No matching evidence was found across the available sources.`, riskLevel: "HIGH", humanAction: "Locate the original payment or invoice and correct the reference only with supporting evidence.", source: "DETERMINISTIC_FALLBACK" };
  if (amountDifference && amountDifference > 0) return { recommendation: "Review the amount variance and check whether this is a partial payment, duplicate, or fee-adjusted settlement.", confidence: 0.78, explanation: `${context.reconciliationReason} The closest evidence differs by ${context.currency} ${amountDifference.toFixed(2)}.`, riskLevel: context.amount <= 0 || amountDifference / context.amount > 0.1 ? "HIGH" : "MEDIUM", humanAction: "Validate the supporting invoice and bank advice; do not reconcile until the variance is explained.", source: "DETERMINISTIC_FALLBACK" };
  return { recommendation: "Review the timing variance and confirm settlement timing with the source system.", confidence: 0.72, explanation: `${context.reconciliationReason}${dateDifference !== undefined ? ` The closest matching date is ${dateDifference} day(s) apart.` : ""}`, riskLevel: dateDifference && dateDifference > 7 ? "HIGH" : "MEDIUM", humanAction: "Confirm settlement date and keep the exception open until the timing difference is verified.", source: "DETERMINISTIC_FALLBACK" };
}

export async function getAiRecommendation(context: ExceptionContext): Promise<AiRecommendation> {
  if (!process.env.GEMINI_API_KEY) return deterministicRecommendation(context);
  const model = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";
  try {
    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `You are a finance operations recommendation assistant. You may explain evidence and recommend a bounded human review action. You must not instruct automatic posting, deletion, alteration, or reconciliation of financial records. Return JSON only with recommendation, confidence (0-1), explanation, riskLevel (LOW|MEDIUM|HIGH), and humanAction.\n\nException context:\n${JSON.stringify({ ...context, date: context.date.toISOString(), closestDate: context.closestDate?.toISOString(), amountDifference: context.closestAmount === undefined ? null : Math.abs(context.amount - context.closestAmount), dateDifferenceDays: context.closestDate === undefined ? null : Math.round(Math.abs(context.date.getTime() - context.closestDate.getTime()) / 86_400_000) })}`;
    const response = await Promise.race([
      client.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Gemini request timed out")), 15_000)),
    ]);
    const parsed = responseSchema.safeParse(JSON.parse(response.text ?? ""));
    if (!parsed.success) return deterministicRecommendation(context);
    return { ...parsed.data, source: "LLM" };
  } catch (error: unknown) {
    const geminiError = error as { status?: number; code?: string; type?: string; message?: string };
    console.error("Gemini recommendation request failed", { status: geminiError.status, code: geminiError.code, type: geminiError.type, message: geminiError.message, model });
    return deterministicRecommendation(context);
  }
}
