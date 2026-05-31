"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  type TooltipProps,
} from "recharts";

export type TopProduct = { name: string; quantity: number };
type Props = { data: TopProduct[] };

const BAR_COLORS = ["#18181b", "#3f3f46", "#52525b", "#71717a", "#a1a1aa"];

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-zinc-700">{payload[0].payload.name}</p>
      <p className="mt-0.5 font-bold text-zinc-900">{payload[0].value} sold</p>
    </div>
  );
}

function truncate(str: string, max = 16) {
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

export default function TopProductsBarChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 8 }} barSize={22}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#a1a1aa" }} allowDecimals={false} />
        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#52525b" }} tickFormatter={(v: string) => truncate(v)} width={110} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f4f4f5" }} />
        <Bar dataKey="quantity" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
