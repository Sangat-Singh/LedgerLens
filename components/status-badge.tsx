export function StatusBadge({ status }: { status: string }) {
  const style = status === "RECONCILED" || status === "AUTO_RECONCILE" || status === "COMPLETED" ? "badge-green" : status === "EXCEPTION" || status === "REVIEW" ? "badge-amber" : status === "UNRESOLVED" ? "badge-red" : "badge-blue";
  return <span className={`badge ${style}`}>{status.replaceAll("_", " ")}</span>;
}
