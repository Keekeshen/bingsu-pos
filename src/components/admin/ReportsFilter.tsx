"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Suspense } from "react";

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
