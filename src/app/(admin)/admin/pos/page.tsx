"use client";

import { useState } from "react";
import { ShoppingCart, LayoutGrid } from "lucide-react";
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

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-1 border-b border-zinc-200 bg-white px-4 py-2">
        <button
          onClick={() => setTab("sell")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            tab === "sell"
              ? "bg-zinc-900 text-white"
              : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          )}
        >
          <ShoppingCart className="h-4 w-4" />
          Sell
        </button>
        <button
          onClick={() => { setTab("tables"); setSelectedTable(null); }}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            tab === "tables"
              ? "bg-zinc-900 text-white"
              : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          )}
        >
          <LayoutGrid className="h-4 w-4" />
          Tables
        </button>
      </div>

      {tab === "sell" ? (
        <div className="flex flex-1 overflow-hidden">
          <section className="flex flex-[3] flex-col overflow-hidden p-4">
            <h1 className="mb-3 text-lg font-bold text-zinc-900">Point of Sale</h1>
            <POSGrid onAddItem={cart.addItem} />
          </section>
          <aside className="flex flex-[2] flex-col border-l border-zinc-200 overflow-hidden">
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
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <section className="flex-1 overflow-y-auto border-r border-zinc-200">
            <TableGrid
              selectedTable={selectedTable}
              onSelectTable={setSelectedTable}
              refreshKey={refreshKey}
            />
          </section>
          <aside
            className={cn(
              "flex flex-col border-zinc-200 overflow-hidden transition-all duration-200",
              selectedTable ? "w-80 border-l" : "w-0"
            )}
          >
            {selectedTable && (
              <TableOrderView
                tableNumber={selectedTable}
                onClose={() => setSelectedTable(null)}
                onOrdersUpdated={() => setRefreshKey((k) => k + 1)}
              />
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
