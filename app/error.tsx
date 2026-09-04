"use client";
export default function ErrorState({ reset }: { reset: () => void }) { return <section><div className="eyebrow">Data unavailable</div><h1 className="page-title">We could not load this view</h1><p className="subtle">The source data has not been changed. Try loading this page again.</p><button className="button" style={{ marginTop: 18 }} onClick={reset}>Retry</button></section>; }
