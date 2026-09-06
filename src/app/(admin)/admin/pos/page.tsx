"use client";

import { useState, useCallback } from "react";
import { ShoppingCart, LayoutGrid, RefreshCw, UtensilsCrossed, ShoppingBag, Bike } from "lucide-react";
import { useCart } from "@/lib/hooks/useCart";
import POSGrid from "@/components/admin/POSGrid";
import CheckoutCart from "@/components/admin/CheckoutCart";
import TableGrid from "@/components/admin/TableGrid";
import TableOrderView from "@/components/admin/TableOrderView";
import { cn } from "@/lib/utils";
import { type OrderMode, POS_ORDER_MODES } from "@/lib/voucher-utils";

type Tab = "sell" | "tables";

const MODE_ICONS: Record<OrderMode, typeof UtensilsCrossed> = {
  dine_in: UtensilsCrossed,
  takeaway: ShoppingBag,
  grab: Bike,
};

export default function POSPage() {
  const cart = useCart();
  const [tab, setTab] = useState<Tab>("sell");
  const [orderMode, setOrderMode] = useState<OrderMode>("dine_in");
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
            {/* Order type — Dine In / Takeaway / Grab Food */}
            <div className="shrink-0 border-b border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-xs font-medium text-zinc-500 mb-2">Order type</p>
              <div className="grid grid-cols-3 gap-2">
                {POS_ORDER_MODES.map((mode) => {
                  const Icon = MODE_ICONS[mode.id];
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setOrderMode(mode.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-xl border-2 py-2.5 text-xs font-semibold transition-all",
                        orderMode === mode.id
                          ? mode.id === "grab"
                            ? "border-orange-500 bg-orange-500 text-white"
                            : mode.id === "takeaway"
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {mode.label}
                    </button>
                  );
                })}
              </div>
              {orderMode !== "dine_in" && (
                <p className="mt-2 text-[11px] text-emerald-700 font-medium">No service charge</p>
              )}
            </div>
            <CheckoutCart
              orderMode={orderMode}
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
