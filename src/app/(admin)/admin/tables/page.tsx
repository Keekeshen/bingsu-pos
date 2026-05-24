"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, QrCode, Download, RefreshCw, XCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Table = {
  id: string;
  table_number: string;
  label: string | null;
  capacity: number;
  created_at: string;
};

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newNumber, setNewNumber] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newCapacity, setNewCapacity] = useState("4");
  const [qrTable, setQrTable] = useState<Table | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const origin = "https://kooridessert.com";

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("tables")
      .select("*")
      .order("table_number");
    setTables(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addTable() {
    if (!newNumber.trim()) { toast.error("Table number is required"); return; }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("tables").insert({
      table_number: newNumber.trim(),
      label: newLabel.trim() || null,
      capacity: parseInt(newCapacity) || 4,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Table ${newNumber.trim()} added`);
    setNewNumber("");
    setNewLabel("");
    setNewCapacity("4");
    load();
  }

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
    toast.success("Refreshed");
  }

  async function cancelPendingOrders(tableNumber: string) {
    if (!confirm(`Cancel all pending (unpaid) orders for Table ${tableNumber}? This cannot be undone.`)) return;
    setCancelling(tableNumber);
    const supabase = createClient();
    // First delete order_items, then delete orders
    const { data: orders } = await supabase
      .from("orders")
      .select("id")
      .eq("table_number", tableNumber)
      .eq("source", "table")
      .eq("status", "pending");
    if (orders?.length) {
      const ids = orders.map(o => o.id);
      await supabase.from("order_items").delete().in("order_id", ids);
      await supabase.from("orders").delete().in("id", ids);
    }
    setCancelling(null);
    toast.success(`Pending orders for Table ${tableNumber} cancelled`);
    load();
  }

  async function deleteTable(id: string, number: string) {
    if (!confirm(`Delete Table ${number}? This cannot be undone.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("tables").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Table deleted");
    load();
  }

  function downloadQR(tableNumber: string) {
    const svg = document.getElementById(`qr-svg-${tableNumber}`)?.querySelector("svg");
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `table-${tableNumber}-qr.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-6 w-24 animate-pulse rounded bg-zinc-200 mb-6" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-zinc-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Tables</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage dining tables and generate QR codes for customers to scan and order.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing} className="shrink-0 h-9 gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-700">Add Table</h2>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Table No. (e.g. 1, A1, VIP)"
            value={newNumber}
            onChange={(e) => setNewNumber(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTable()}
            className="h-9 w-44 text-sm"
          />
          <Input
            placeholder="Label (optional)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="h-9 w-44 text-sm"
          />
          <Input
            placeholder="Capacity"
            type="number"
            min="1"
            value={newCapacity}
            onChange={(e) => setNewCapacity(e.target.value)}
            className="h-9 w-24 text-sm"
          />
          <Button size="sm" onClick={addTable} disabled={saving} className="h-9">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Table
          </Button>
        </div>
      </div>

      {tables.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 py-16 text-zinc-400">
          <QrCode className="h-10 w-10 mb-3" />
          <p className="text-sm font-medium">No tables yet</p>
          <p className="text-xs mt-1">Add your first table above to generate a QR code.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {tables.map((table) => (
            <div
              key={table.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 flex flex-col gap-3 hover:border-zinc-300 transition-colors"
            >
              <div>
                <p className="text-xl font-bold text-zinc-900">
                  Table {table.table_number}
                </p>
                {table.label && (
                  <p className="text-xs text-zinc-500 mt-0.5">{table.label}</p>
                )}
                <p className="text-xs text-zinc-400 mt-0.5">
                  {table.capacity} seats
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setQrTable(table)}
                  className="h-8 flex-1 text-xs"
                >
                  <QrCode className="mr-1 h-3.5 w-3.5" />
                  QR Code
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  title="Cancel pending orders"
                  onClick={() => cancelPendingOrders(table.table_number)}
                  disabled={cancelling === table.table_number}
                  className="h-8 w-8 p-0 text-amber-400 hover:text-amber-600 hover:bg-amber-50"
                >
                  <XCircle className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteTable(table.id, table.table_number)}
                  className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!qrTable} onOpenChange={() => setQrTable(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Table {qrTable?.table_number} QR Code</DialogTitle>
            <DialogDescription>
              Print or display this QR code at the table. Customers scan to view the menu and order.
            </DialogDescription>
          </DialogHeader>
          {qrTable && (
            <div className="flex flex-col items-center gap-4 py-2">
              <div
                id={`qr-svg-${qrTable.table_number}`}
                className="rounded-2xl border border-zinc-200 bg-white p-5"
              >
                <QRCodeSVG
                  value={`${origin}/order/${qrTable.id}`}
                  size={200}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div className="text-center">
                <p className="text-xs text-zinc-500 break-all">
                  {origin}/order/{qrTable.id}
                </p>
              </div>
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => downloadQR(qrTable.table_number)}
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  Download SVG
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(`${origin}/order/${qrTable.id}`, "_blank")}
                >
                  Preview
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
