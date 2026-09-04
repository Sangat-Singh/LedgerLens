"use client";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
export function StatusChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  return <div style={{ height: 250 }}><ResponsiveContainer><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3}>{data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>{data.map((item) => <span key={item.name} style={{ fontSize: 12, color: "#64748b" }}><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 99, background: item.color, marginRight: 5 }} />{item.name}: {item.value}</span>)}</div></div>;
}
