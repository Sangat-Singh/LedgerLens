import Link from "next/link";

const links = [
  ["Dashboard", "/"], ["Records", "/records"], ["Exceptions", "/exceptions"],
  ["Audit Log", "/audit-log"], ["Evaluation", "/evaluation"],
];

export function Sidebar() {
  return <aside className="sidebar">
    <div className="brand"><strong>LedgerLens</strong><span>AI Finance Controller</span></div>
    <nav>{links.map(([label, href]) => <Link key={href} href={href} className="nav-link">{label}</Link>)}</nav>
  </aside>;
}
