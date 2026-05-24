"use client";

import { useState, useCallback } from "react";
import { ShoppingCart, LayoutGrid, RefreshCw } from "lucide-react";
import { useCart } from "@/lib/hooks/useCart";
import POSGrid from "@/components/admin/POSGrid";
import CheckoutCart from "@/components/admin/CheckoutCart";
import TableGrid from "@/components/admin/TableGrid";
import TableOrderView from "@/components/admin/TableOrderView";
import { cn } from "@/lib/utils";

type Tab = "sell" | "tables";

export default function POSPage() {
  const cart = useCart();
  const [tab, setTab] = useState<Tab>("sell");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleOrdersUpdated = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-zinc-200 bg-white px-3 py-2 shrink-0">
        <button
          onClick={() => setTab("sell")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            tab === "sell"
              ? "bg-zinc-900 text-white"
              : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
          )}
        >
          <ShoppingCart className="h-4 w-4" />
          Sell
        </button>
        <button
          onClick={() => setTab("tables")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            tab === "tables"
              ? "bg-zinc-900 text-white"
              : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
          )}
        >
          <LayoutGrid className="h-4 w-4" />
          Tables
        </button>

        {tab === "tables" && (
          <button
            onClick={handleRefresh}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-800"
            title="Refresh table statuses"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        )}
      </div>

      {/* Sell tab */}
      {tab === "sell" && (
        <div className="flex flex-1 overflow-hidden min-h-0">
          <section className="flex flex-[3] flex-col overflow-hidden p-4">
            <h1 className="mb-3 text-lg font-bold text-zinc-900">Point of Sale</h1>
            <POSGrid onAddItem={cart.addItem} />
          </section>
          <aside className="flex flex-[2] flex-col border-l border-zinc-200 overflow-hidden min-h-0">
            <CheckoutCart
              items={cart.items}
              subtotal={cart.subtotal}
              total={cart.total}
              itemCount={cart.itemCount}
              onUpdateQuantity={cart.updateQuantity}
              onRemoveItem={cart.removeItem}
              onClearCart={cart.clearCart}
            />
          </aside>
        </div>
      )}

      {/* Tables tab */}
      {tab === "tables" && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: table grid */}
          <div className="w-72 shrink-0 overflow-y-auto border-r border-zinc-200 bg-white">
            <TableGrid
              selectedTable={selectedTable}
              onSelectTable={setSelectedTable}
              refreshKey={refreshKey}
            />
          </div>

          {/* Right: order view or empty state */}
          <div className="flex flex-1 flex-col overflow-hidden bg-zinc-50">
            {selectedTable ? (
              <TableOrderView
                key={selectedTable}
                tableNumber={selectedTable}
                onClose={() => setSelectedTable(null)}
                onOrdersUpdated={handleOrdersUpdated}
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-zinc-300">
                <LayoutGrid className="h-14 w-14" />
                <p className="text-sm font-medium">Select a table to manage orders</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
