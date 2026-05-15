"use client";

import { useState, useEffect, use } from "react";
import { Plus, Minus, ShoppingCart, CheckCircle, ChefHat, X, Star, LogIn } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  image_url: string | null;
};

type CartItem = {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
};

export default function TableOrderPage({
  params,
}: {
  params: Promise<{ tableNumber: string }>;
}) {
  const { tableNumber } = use(params);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderCount, setOrderCount] = useState(0);
  const [showCart, setShowCart] = useState(false);
  const [showLoyalty, setShowLoyalty] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/menu")
      .then((r) => r.json())
      .then((d) => { setProducts(d.products ?? []); setLoading(false); })
      .catch(() => { toast.error("Failed to load menu"); setLoading(false); });

    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        setUserName(session.user.user_metadata?.full_name || session.user.email || null);
      }
    });
  }, []);

  const categories = Array.from(new Set(products.map((p) => p.category ?? "Other")));

  function getQty(id: string) {
    return cart.find((i) => i.product_id === id)?.quantity ?? 0;
  }

  function add(p: Product) {
    setCart((prev) => {
      const ex = prev.find((i) => i.product_id === p.id);
      if (ex) return prev.map((i) => i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product_id: p.id, name: p.name, price: p.price, quantity: 1 }];
    });
  }

  function remove(id: string) {
    setCart((prev) => {
      const ex = prev.find((i) => i.product_id === id);
      if (!ex) return prev;
      if (ex.quantity <= 1) return prev.filter((i) => i.product_id !== id);
      return prev.map((i) => i.product_id === id ? { ...i, quantity: i.quantity - 1 } : i);
    });
  }

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  async function submitOrder() {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/table-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_number: tableNumber,
          customer_id: userId || null,
          items: cart.map(({ product_id, name, price, quantity }) => ({
            product_id,
            product_name: name,
            unit_price: price,
            quantity,
          })),
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        toast.error(e.error ?? "Failed to submit order");
        return;
      }
      setOrderCount((c) => c + 1);
      setCart([]);
      setShowCart(false);
      toast.success("Order sent to kitchen!");
      if (!userId) setShowLoyalty(true);
    } catch {
      toast.error("Network error, please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-32">
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="mx-auto max-w-lg px-4 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-zinc-700" />
              <span className="font-bold text-zinc-900">Bingsu Delight</span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">Table {tableNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            {orderCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                <CheckCircle className="h-3.5 w-3.5" />
                {orderCount} round{orderCount > 1 ? "s" : ""} sent
              </div>
            )}
            {userId ? (
              <div className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-600">
                <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                <span className="hidden sm:inline">{userName?.split(" ")[0] || "Member"}</span>
              </div>
            ) : (
              <button
                onClick={() => window.location.href = `/login?next=/order/${tableNumber}`}
                className="flex items-center gap-1 rounded-full border border-zinc-200 px-2.5 py-1 text-xs text-zinc-500 hover:border-zinc-400 hover:text-zinc-700"
              >
                <LogIn className="h-3 w-3" /> Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-4 space-y-6">
        {categories.map((cat) => (
          <section key={cat}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">{cat}</h2>
            <div className="space-y-2">
              {products
                .filter((p) => (p.category ?? "Other") === cat)
                .map((product) => {
                  const qty = getQty(product.id);
                  return (
                    <div key={product.id} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm">
                      {product.image_url && (
                        <img src={product.image_url} alt={product.name} className="h-16 w-16 rounded-lg object-cover flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-zinc-900 truncate">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{product.description}</p>
                        )}
                        <p className="mt-1 text-sm font-semibold text-zinc-700">RM {product.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {qty > 0 && (
                          <>
                            <button onClick={() => remove(product.id)} className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 hover:border-zinc-400 active:scale-95">
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-5 text-center text-sm font-semibold tabular-nums">{qty}</span>
                          </>
                        )}
                        <button onClick={() => add(product)} className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-white hover:bg-zinc-700 active:scale-95">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        ))}
        {products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            <ChefHat className="h-10 w-10 mb-3" />
            <p className="text-sm">Menu not available right now.</p>
          </div>
        )}
      </main>

      {/* Cart FAB */}
      {totalItems > 0 && !showCart && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-full bg-zinc-900 px-6 py-3 text-white shadow-xl hover:bg-zinc-700 transition-colors active:scale-95"
        >
          <ShoppingCart className="h-4 w-4" />
          <span className="text-sm font-semibold">{totalItems} item{totalItems !== 1 ? "s" : ""} &middot; RM {totalPrice.toFixed(2)}</span>
        </button>
      )}

      {/* Cart Sheet */}
      {showCart && (
        <div className="fixed inset-0 z-20 flex flex-col justify-end bg-black/50" onClick={() => setShowCart(false)}>
          <div className="rounded-t-2xl bg-white p-4 max-h-[75vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-zinc-900">Your Order</h3>
              <button onClick={() => setShowCart(false)} className="rounded-full p-1 hover:bg-zinc-100">
                <X className="h-4 w-4 text-zinc-500" />
              </button>
            </div>
            <ul className="divide-y divide-zinc-100 mb-4">
              {cart.map((item) => (
                <li key={item.product_id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="text-sm font-medium text-zinc-900 truncate">{item.name}</p>
                    <p className="text-xs text-zinc-400">RM {item.price.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => remove(item.product_id)} className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 active:scale-95">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-5 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                    <button
                      onClick={() => { const p = products.find((x) => x.id === item.product_id); if (p) add(p); }}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-white active:scale-95"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between mb-4 border-t border-zinc-100 pt-3">
              <span className="text-sm font-bold text-zinc-900">Total</span>
              <span className="text-sm font-bold text-zinc-900">RM {totalPrice.toFixed(2)}</span>
            </div>
            {orderCount > 0 && (
              <p className="mb-3 text-center text-xs text-green-600 font-medium">
                {orderCount} previous round{orderCount > 1 ? "s" : ""} sent. Adding more?
              </p>
            )}
            <button
              onClick={submitOrder}
              disabled={submitting || cart.length === 0}
              className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-bold text-white disabled:opacity-60 hover:bg-zinc-700 transition-colors active:scale-95"
            >
              {submitting ? "Sending to kitchen..." : "Send to Kitchen"}
            </button>
          </div>
        </div>
      )}

      {/* Loyalty sign-in prompt */}
      {showLoyalty && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end bg-black/50" onClick={() => setShowLoyalty(false)}>
          <div className="rounded-t-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                  <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                </div>
                <div>
                  <p className="font-bold text-zinc-900">Earn loyalty points!</p>
                  <p className="text-xs text-zinc-500">Sign in to collect points on this order.</p>
                </div>
              </div>
              <button onClick={() => setShowLoyalty(false)} className="rounded-full p-1 hover:bg-zinc-100">
                <X className="h-4 w-4 text-zinc-400" />
              </button>
            </div>
            <p className="text-sm text-zinc-600 mb-4">
              Every ringgit spent earns you points you can redeem for free items. Sign in or create a free account to start earning!
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { window.location.href = `/login?next=/order/${tableNumber}`; }}
                className="flex-1 rounded-xl bg-zinc-900 py-3 text-sm font-bold text-white hover:bg-zinc-700 active:scale-95 transition-colors"
              >
                Sign In / Register
              </button>
              <button
                onClick={() => setShowLoyalty(false)}
                className="flex-1 rounded-xl border border-zinc-200 py-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50 active:scale-95"
              >
                No Thanks
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
