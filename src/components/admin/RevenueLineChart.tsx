"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export type DailyRevenue = {
  date: string;
  revenue: number;
};

type Props = { data: DailyRevenue[] };

function formatDateLabel(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-MY", { month: "short", day: "numeric" });
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-zinc-700">{formatDateLabel(label as string)}</p>
      <p className="mt-0.5 font-bold text-zinc-900">RM {(payload[0].value ?? 0).toFixed(2)}</p>
    </div>
  );
}

export default function RevenueLineChart({ data }: Props) {
  const tickIndices = new Set(data.map((_, i) => i).filter((i) => i % 7 === 0 || i === data.length - 1));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#a1a1aa" }} tickFormatter={(v, i) => tickIndices.has(i) ? formatDateLabel(v as string) : ""} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#a1a1aa" }} tickFormatter={(v: number) => `RM ${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`} width={64} />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="revenue" stroke="#18181b" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#18181b", strokeWidth: 0 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
