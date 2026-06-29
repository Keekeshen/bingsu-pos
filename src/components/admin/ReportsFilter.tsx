"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function currentMYT() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
}

function weekLabel(weekOffset: number) {
  const now = currentMYT();
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-MY", { day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" });
  const yearStr = sunday.getFullYear() !== monday.getFullYear() || weekOffset === 0
    ? ` ${sunday.getFullYear()}` : "";
  return `${fmt(monday)} – ${fmt(sunday)}${yearStr}`;
}

function FilterInner() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const now = currentMYT();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const period = params.get("period") ?? "month";
  const year = parseInt(params.get("y") ?? String(currentYear));
  const month = parseInt(params.get("m") ?? String(currentMonth));
  const weekOffset = parseInt(params.get("w") ?? "0");

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i + 1);

  function nav(updates: Record<string, string>) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(updates)) p.set(k, v);
    router.push(`${pathname}?${p.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Period tabs */}
      <div className="flex rounded-xl border border-zinc-200 bg-zinc-100 p-1 gap-0.5">
        {(["week", "month", "year"] as const).map(p => (
          <button key={p} onClick={() => nav({ period: p, y: String(year), m: String(month), w: "0" })}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${
              period === p ? "bg-white shadow text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}>
            {p}
          </button>
        ))}
      </div>

      {/* Week navigation */}
      {period === "week" && (
        <div className="flex items-center gap-1.5">
          <button onClick={() => nav({ period: "week", w: String(weekOffset - 1) })}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-600 hover:bg-zinc-50">
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          <span className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-sm font-medium text-zinc-800 whitespace-nowrap">
            {weekLabel(weekOffset)}
          </span>
          {weekOffset < 0 && (
            <button onClick={() => nav({ period: "week", w: String(weekOffset + 1) })}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-600 hover:bg-zinc-50">
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
          {weekOffset !== 0 && (
            <button onClick={() => nav({ period: "week", w: "0" })}
              className="px-3 py-1.5 rounded-lg border border-zinc-300 bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700">
              This week
            </button>
          )}
        </div>
      )}

      {/* Month + Year selectors */}
      {period === "month" && (
        <div className="flex items-center gap-2">
          <button onClick={() => {
            let nm = month - 1, ny = year;
            if (nm < 1) { nm = 12; ny--; }
            nav({ period: "month", m: String(nm), y: String(ny) });
          }} className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-sm font-semibold text-zinc-800 whitespace-nowrap min-w-[130px] text-center">
            {MONTH_FULL[month - 1]} {year}
          </span>
          <button onClick={() => {
            let nm = month + 1, ny = year;
            if (nm > 12) { nm = 1; ny++; }
            if (ny > currentYear || (ny === currentYear && nm > currentMonth)) return;
            nav({ period: "month", m: String(nm), y: String(ny) });
          }} className={`p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 ${
            year === currentYear && month >= currentMonth ? "opacity-30 cursor-not-allowed" : ""}`}>
            <ChevronRight className="h-4 w-4" />
          </button>
          <select value={year} onChange={e => nav({ period: "month", y: e.target.value, m: String(month) })}
            className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-700 focus:outline-none focus:border-zinc-400">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}

      {/* Year selector */}
      {period === "year" && (
        <div className="flex items-center gap-2">
          <button onClick={() => nav({ period: "year", y: String(year - 1) })}
            className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-4 py-1.5 rounded-lg border border-zinc-200 bg-white text-sm font-semibold text-zinc-800">
            {year}
          </span>
          <button onClick={() => { if (year < currentYear) nav({ period: "year", y: String(year + 1) }); }}
            className={`p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 ${year >= currentYear ? "opacity-30 cursor-not-allowed" : ""}`}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function ReportsFilter() {
  return (
    <Suspense fallback={<div className="h-10 w-64 rounded-xl bg-zinc-100 animate-pulse" />}>
      <FilterInner />
    </Suspense>
  );
}

export type ProductSaleRow = {
  name: string;
  code: string | null;
  category: string | null;
  quantity: number;
};

const ALL_CATEGORIES = "All";

export function ProductSalesTable({ rows }: { rows: ProductSaleRow[] }) {
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.category) set.add(r.category);
    }
    return [ALL_CATEGORIES, ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORIES);

  const filtered = useMemo(() => {
    const list = activeCategory === ALL_CATEGORIES
      ? rows
      : rows.filter((r) => r.category === activeCategory);
    return [...list].sort((a, b) => {
      if (b.quantity !== a.quantity) return b.quantity - a.quantity;
      const ca = a.code ?? "";
      const cb = b.code ?? "";
      if (ca && cb) return ca.localeCompare(cb, undefined, { numeric: true, sensitivity: "base" });
      return a.name.localeCompare(b.name);
    });
  }, [rows, activeCategory]);

  const totalUnits = filtered.reduce((s, p) => s + p.quantity, 0);
  const maxQty = filtered.reduce((m, p) => Math.max(m, p.quantity), 0);
  const zeroCount = filtered.filter((r) => r.quantity === 0).length;

  if (rows.length === 0) {
    return <p className="px-6 py-10 text-center text-sm text-zinc-400">No products found</p>;
  }

  return (
    <div>
      <div className="px-4 pb-3 pt-1 overflow-x-auto [&::-webkit-scrollbar]:hidden border-b border-zinc-100">
        <div className="flex gap-2 w-max min-w-full">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "h-9 px-4 shrink-0 rounded-lg text-sm font-semibold capitalize whitespace-nowrap transition-all",
                activeCategory === cat
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-800",
              )}
            >
              {cat === ALL_CATEGORIES ? "All categories" : cat}
            </button>
          ))}
        </div>
      </div>

      {activeCategory !== ALL_CATEGORIES && (
        <p className="px-4 py-2 text-xs text-zinc-500 bg-zinc-50 border-b border-zinc-100">
          {filtered.length} product{filtered.length !== 1 ? "s" : ""} in{" "}
          <span className="font-semibold capitalize">{activeCategory}</span>
          {zeroCount > 0 && (
            <span className="text-amber-600"> - {zeroCount} with 0 sales</span>
          )}
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-zinc-400">No products in this category</p>
      ) : (
        <div className="max-h-[520px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10">
              <TableRow className="text-xs text-zinc-500">
                <TableHead className="w-10">#</TableHead>
                <TableHead className="w-16">Code</TableHead>
                <TableHead>Product</TableHead>
                {activeCategory === ALL_CATEGORIES && <TableHead>Category</TableHead>}
                <TableHead className="text-right">Qty Sold</TableHead>
                <TableHead className="text-right w-24">Share</TableHead>
                <TableHead className="w-40">Sales</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row, i) => {
                const share = totalUnits > 0 ? (row.quantity / totalUnits) * 100 : 0;
                const barPct = maxQty > 0 ? (row.quantity / maxQty) * 100 : 0;
                const isZero = row.quantity === 0;
                return (
                  <TableRow key={row.name} className={cn("text-sm", isZero && "bg-zinc-50/80")}>
                    <TableCell className="text-zinc-400 tabular-nums">{i + 1}</TableCell>
                    <TableCell className="font-mono text-xs font-bold text-zinc-500">
                      {row.code ?? <span className="text-zinc-300">-</span>}
                    </TableCell>
                    <TableCell className={cn("font-medium", isZero ? "text-zinc-400" : "text-zinc-800")}>
                      {row.name}
                    </TableCell>
                    {activeCategory === ALL_CATEGORIES && (
                      <TableCell className="capitalize text-zinc-500 text-xs">{row.category ?? "-"}</TableCell>
                    )}
                    <TableCell className={cn("text-right tabular-nums font-semibold", isZero ? "text-zinc-300" : "text-zinc-900")}>
                      {row.quantity}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-zinc-500 text-xs">
                      {row.quantity > 0 ? `${share.toFixed(1)}%` : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            isZero ? "bg-zinc-200"
                              : row.quantity >= maxQty * 0.5 ? "bg-zinc-900"
                              : row.quantity >= maxQty * 0.2 ? "bg-zinc-500"
                              : "bg-zinc-300",
                          )}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
