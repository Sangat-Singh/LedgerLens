import { StatusBadge } from "@/components/status-badge";
import { StatusChart } from "@/components/status-chart";
import { getChartData, getMetrics } from "@/lib/metrics";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default async function Dashboard() {
  const [metrics, chart, recent] = await Promise.all([getMetrics(), getChartData(), prisma.reconciliationDecision.findMany({ take: 6, orderBy: { createdAt: "desc" }, include: { record: true } })]);
  const aiMode = process.env.GEMINI_API_KEY ? "LLM enabled" : "Safe fallback";
  const cards = [["Total records", metrics.totalRecords.toLocaleString(), "Seeded financial entries"], ["Reconciled", metrics.reconciled.toLocaleString(), `${(metrics.matchRate * 100).toFixed(1)}% match rate`], ["Exceptions", metrics.exceptions.toLocaleString(), `${(metrics.exceptionRate * 100).toFixed(1)}% need review`], ["Unresolved", metrics.unresolved.toLocaleString(), "No safe match found"], ["Total amount", currency.format(metrics.totalAmount), "Across all sources"], ["AI Controller", aiMode, "Advisory recommendations only"], ["Evaluation accuracy", `${(metrics.accuracy * 100).toFixed(1)}%`, metrics.processingDetail]];
  return <section><div className="eyebrow">Finance operations</div><h1 className="page-title">Reconciliation command center</h1><p className="subtle">Live results calculated from your Neon PostgreSQL reconciliation batch.</p><div className="metric-grid">{cards.map(([label, value, note]) => <article className="metric" key={label}><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-note">{note}</div></article>)}</div><div className="grid-two"><article className="panel"><div className="panel-head"><h2>Reconciliation status</h2><span className="subtle">Current batch</span></div><StatusChart data={chart} /></article><article className="panel"><div className="panel-head"><h2>Recent decisions</h2><span className="subtle">Auditable</span></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Reference</th><th>Decision</th><th>Confidence</th></tr></thead><tbody>{recent.map((row) => <tr key={row.id}><td>{row.record.referenceNumber}</td><td><StatusBadge status={row.decision} /></td><td>{Math.round(row.confidence * 100)}%</td></tr>)}</tbody></table></div></article></div></section>;
}
