"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Clock, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type TableRow = {
  id: string;
  table_number: string;
  label: string | null;
  capacity: number;
};

type TableStatus = {
  table_number: string;
  pending: number;
  served: number;
  completed: number;
};

type Props = {
  onSelectTable: (tableNumber: string | null) => void;
  selectedTable: string | null;
  refreshKey?: number;
};

export default function TableGrid({ onSelectTable, selectedTable, refreshKey }: Props) {
  const [tables, setTables] = useState<TableRow[]>([]);
  const [statuses, setStatuses] = useState<Record<string, TableStatus>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: tableData }, { data: orderData }] = await Promise.all([
      supabase.from("tables").select("*").order("table_number"),
      supabase
        .from("orders")
        .select("table_number, status")
        .eq("source", "table")
        .not("table_number", "is", null),
    ]);

    setTables(tableData ?? []);

    const map: Record<string, TableStatus> = {};
    for (const order of orderData ?? []) {
      const tn = order.table_number as string;
      if (!map[tn]) map[tn] = { table_number: tn, pending: 0, served: 0, completed: 0 };
      if (order.status === "pending") map[tn].pending++;
      else if (order.status === "served") map[tn].served++;
      else if (order.status === "completed") map[tn].completed++;
    }
    setStatuses(map);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("table-orders-watch")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2 p-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-100" />
        ))}
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-zinc-400">
        <Users className="h-8 w-8 mb-2" />
        <p className="text-sm">No tables set up yet.</p>
        <a href="/admin/tables" className="mt-1 text-xs underline hover:text-zinc-600">
          Go to Tables to add some
        </a>
      </div>
    );
  }

  return (
    <div className="p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400">
        Tables
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tables.map((table) => {
          const status = statuses[table.table_number];
          const hasPending = (status?.pending ?? 0) > 0;
          const hasServed = (status?.served ?? 0) > 0 && (status?.pending ?? 0) === 0;
          const isSelected = selectedTable === table.table_number;

          return (
            <button
              key={table.id}
              onClick={() =>
                onSelectTable(
                  isSelected ? null : table.table_number
                )
              }
              className={cn(
                "relative flex flex-col items-start rounded-xl border p-3 text-left transition-all",
                isSelected
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : hasPending
                  ? "border-amber-300 bg-amber-50 hover:border-amber-400"
                  : hasServed
                  ? "border-emerald-400 bg-emerald-50 hover:border-emerald-500"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              )}
            >
              <span
                className={cn(
                  "text-lg font-bold",
                  isSelected ? "text-white" : "text-zinc-900"
                )}
              >
                {table.table_number}
              </span>
              {table.label && (
                <span
                  className={cn(
                    "text-xs",
                    isSelected ? "text-zinc-300" : "text-zinc-400"
                  )}
                >
                  {table.label}
                </span>
              )}
              <div className="mt-2 flex items-center gap-2">
                {hasPending ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-amber-700">
                    <Clock className="h-3 w-3" />
                    {status.pending} pending
                  </span>
                ) : hasServed ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Pay now
                  </span>
                ) : (
                  <span className={cn("flex items-center gap-1 text-xs", isSelected ? "text-zinc-400" : "text-zinc-400")}>
                    <CheckCircle2 className="h-3 w-3" />
                    Available
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
