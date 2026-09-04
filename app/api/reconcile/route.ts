import { NextResponse } from "next/server";
import { runReconciliation } from "@/lib/reconciliation/service";
export async function POST() { try { return NextResponse.json(await runReconciliation()); } catch (error) { console.error("Reconciliation failed", error); return NextResponse.json({ error: "Unable to process reconciliation batch." }, { status: 500 }); } }
