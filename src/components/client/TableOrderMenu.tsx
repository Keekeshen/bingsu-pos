"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Plus, Minus, ShoppingCart, CheckCircle, ChefHat, X, Check } from "lucide-react";
import { toast } from "sonner";

const TOPPINGS = [
  "Mango Popping Ball",
  "Melon Jelly",
  "Aiyu Jelly",
  "Grass Jelly",
  "Taufufa",
  "Taro Ball",
  "Cream Cheese",
  "Boba Jelly",
];
const TOPPING_PRICE = 2;

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  image_url: string | null;
};

type CartItem = {
  key: string;
  product_id: string;
  name: string;
  basePrice: number;
  toppings: string[];
  unitPrice: number;
  quantity: number;
};

type Props = { tableSlug: string; tableNumber?: string };

function toppingKey(productId: string, toppings: string[]) {
  return productId + (toppings.length ? "|" + [...toppings].sort().join(",") : "");
}

export default function TableOrderMenu({ tableSlug, tableNumber }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderCount, setOrderCount] = useState(0);
  const [showCart, setShowCart] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [detail, setDetail] = useState<Product | null>(null);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [remark, setRemark] = useState("");

  useEffect(() => {
    fetch("/api/menu")
      .then((r) => r.json())
      .then((d) => { setProducts(d.products ?? []); setLoading(false); })
      .catch(() => { toast.error("Failed to load menu"); setLoading(false); });
  }, []);

  const categories = Array.from(new Set(products.map((p) => p.category ?? "Other")));
  const visibleCategories = activeCategory ? categories.filter(c => c === activeCategory) : categories;

  function openDetail(p: Product) {
    setDetail(p);
    setSelectedToppings([]);
  }

  function toggleTopping(t: string) {
    setSelectedToppings(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  }

  function getCartQty(productId: string, toppings: string[]) {
    const k = toppingKey(productId, toppings);
    return cart.find(i => i.key === k)?.quantity ?? 0;
  }

  function getTotalQtyForProduct(productId: string) {
    return cart.filter(i => i.product_id === productId).reduce((s, i) => s + i.quantity, 0);
  }

  function addToCart(product: Product, toppings: string[]) {
    const k = toppingKey(product.id, toppings);
    const unitPrice = +(product.price + toppings.length * TOPPING_PRICE).toFixed(2);
    setCart(prev => {
      const ex = prev.find(i => i.key === k);
      if (ex) return prev.map(i => i.key === k ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { key: k, product_id: product.id, name: product.name, basePrice: product.price, toppings, unitPrice, quantity: 1 }];
    });
  }

  function removeFromCart(key: string) {
    setCart(prev => {
      const ex = prev.find(i => i.key === key);
      if (!ex) return prev;
      if (ex.quantity <= 1) return prev.filter(i => i.key !== key);
      return prev.map(i => i.key === key ? { ...i, quantity: i.quantity - 1 } : i);
    });
  }

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  const detailToppingPrice = selectedToppings.length * TOPPING_PRICE;
  const detailTotalPrice = detail ? detail.price + detailToppingPrice : 0;
  const detailQty = detail ? getCartQty(detail.id, selectedToppings) : 0;

  async function submitOrder() {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const items = cart.map(item => ({
        product_id: item.product_id,
        product_name: item.toppings.length
          ? `${item.name} (+ ${item.toppings.join(", ")})`
          : item.name,
        unit_price: item.unitPrice,
        quantity: item.quantity,
      }));

      const res = await fetch("/api/table-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_slug: tableSlug, customer_id: null, items, notes: remark.trim() || null }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        toast.error(e.error ?? "Failed to submit order");
        return;
      }
      setOrderCount(c => c + 1);
      setCart([]);
      setRemark("");
      setShowCart(false);
      setShowSuccess(true);
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
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="mx-auto max-w-lg px-4 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-zinc-700" />
              <span className="font-bold text-zinc-900">Koori Dessert</span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Dine-in order{tableNumber ? ` · Table ${tableNumber}` : ""}
            </p>
          </div>
          {orderCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              <CheckCircle className="h-3.5 w-3.5" />
              {orderCount} round{orderCount > 1 ? "s" : ""} sent
            </div>
          )}
        </div>
      </header>

      {/* Sticky category filter */}
      <div className="sticky top-[65px] z-10 bg-zinc-50 border-b border-zinc-200 shadow-sm">
        <div className="mx-auto max-w-lg flex gap-2 overflow-x-auto px-4 py-2.5 no-scrollbar">
          <button
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${activeCategory === null ? "bg-zinc-900 text-white" : "bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-400"}`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-colors ${activeCategory === cat ? "bg-zinc-900 text-white" : "bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-400"}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu */}
      <main className="mx-auto max-w-lg px-4 pt-4 space-y-6">
        {visibleCategories.map(cat => (
          <section key={cat}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">{cat}</h2>
            <div className="grid grid-cols-2 gap-3">
              {products
                .filter(p => (p.category ?? "Other") === cat)
                .map(product => {
                  const totalQty = getTotalQtyForProduct(product.id);
                  return (
                    <div key={product.id} className="relative flex flex-col rounded-2xl bg-white shadow-sm overflow-hidden">
                      <button className="relative w-full aspect-square bg-zinc-100 overflow-hidden" onClick={() => openDetail(product)}>
                        {product.image_url ? (
                          <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <ChefHat className="h-8 w-8 text-zinc-300" />
                          </div>
                        )}
                      </button>
                      <div className="p-2.5 flex flex-col gap-1.5">
                        <button className="text-left" onClick={() => openDetail(product)}>
                          <p className="text-sm font-semibold text-zinc-900 line-clamp-2 leading-tight">{product.name}</p>
                          {product.description && (
                            <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2 leading-snug">{product.description}</p>
                          )}
                          <p className="text-sm font-bold text-zinc-800 mt-1">RM {product.price.toFixed(2)}</p>
                        </button>
                        <div className="flex items-center justify-end gap-2 mt-0.5">
                          <button
                            onClick={() => openDetail(product)}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-white hover:bg-zinc-700 active:scale-95"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {totalQty > 0 && (
                        <div className="absolute top-2 right-2 h-5 w-5 flex items-center justify-center rounded-full bg-zinc-900 text-white text-[10px] font-bold">
                          {totalQty}
                        </div>
                      )}
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
          <span className="text-sm font-semibold">{totalItems} item{totalItems !== 1 ? "s" : ""} · RM {totalPrice.toFixed(2)}</span>
        </button>
      )}

      {/* Cart sheet */}
      {showCart && (
        <div className="fixed inset-0 z-20 flex flex-col justify-end bg-black/50" onClick={() => setShowCart(false)}>
          <div className="rounded-t-2xl bg-white p-4 max-h-[75vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-zinc-900">Your Order</h3>
              <button onClick={() => setShowCart(false)} className="rounded-full p-1 hover:bg-zinc-100">
                <X className="h-4 w-4 text-zinc-500" />
              </button>
            </div>
            <ul className="divide-y divide-zinc-100 mb-4">
              {cart.map(item => (
                <li key={item.key} className="flex items-start justify-between py-2.5 gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900">{item.name}</p>
                    {item.toppings.length > 0 && (
                      <p className="text-xs text-zinc-400 mt-0.5">+{item.toppings.join(", ")}</p>
                    )}
                    <p className="text-xs text-zinc-400 mt-0.5">RM {item.unitPrice.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 mt-0.5">
                    <button onClick={() => removeFromCart(item.key)} className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 active:scale-95">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-5 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                    <button
                      onClick={() => addToCart(products.find(p => p.id === item.product_id)!, item.toppings)}
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
            {/* Remark */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Remark / Special request (optional)</label>
              <textarea
                rows={2}
                value={remark}
                onChange={e => setRemark(e.target.value)}
                placeholder="e.g. less sweet, no ice, extra topping on the side…"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
              />
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
              {submitting ? "Sending order..." : "Confirm Order"}
            </button>
          </div>
        </div>
      )}

      {/* Success screen */}
      {showSuccess && (
        <div className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-white px-6 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-10 w-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-black text-zinc-900">Order Confirmed!</h2>
          {tableNumber && (
            <div className="mt-3 flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-1.5">
              <span className="text-xs text-zinc-500">Table</span>
              <span className="text-lg font-black text-zinc-900">{tableNumber}</span>
            </div>
          )}
          <p className="mt-2 text-base text-zinc-500">Your order has been sent to the counter.</p>
          <div className="mt-4 w-full rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4">
            <p className="text-sm font-bold text-amber-800">Please pay at the counter</p>
            <p className="mt-1 text-xs text-amber-700">Head to the counter to settle your bill. Your order will be prepared after payment.</p>
          </div>
          <button onClick={() => setShowSuccess(false)} className="mt-6 w-full rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-700">
            Order more
          </button>
        </div>
      )}

      {/* Product detail modal */}
      {detail && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/60" onClick={() => setDetail(null)}>
          <div className="rounded-t-3xl bg-white overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Image */}
            <div className="relative w-full aspect-video bg-zinc-100 shrink-0">
              {detail.image_url ? (
                <Image src={detail.image_url} alt={detail.name} fill className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <ChefHat className="h-12 w-12 text-zinc-300" />
                </div>
              )}
              <button onClick={() => setDetail(null)} className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex flex-col gap-4 p-5 overflow-y-auto">
              {/* Name + price */}
              <div>
                <h2 className="text-xl font-black text-zinc-900">{detail.name}</h2>
                <p className="text-lg font-bold text-zinc-700 mt-0.5">
                  RM {detailTotalPrice.toFixed(2)}
                  {detailToppingPrice > 0 && (
                    <span className="ml-1.5 text-sm font-normal text-zinc-400">(+RM {detailToppingPrice.toFixed(2)} toppings)</span>
                  )}
                </p>
                {detail.description && (
                  <p className="mt-2 text-base text-zinc-500 leading-relaxed">{detail.description}</p>
                )}
              </div>

              {/* Toppings */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-zinc-900">Extra Toppings</p>
                  <span className="text-xs text-zinc-400">+RM {TOPPING_PRICE.toFixed(2)} each</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {TOPPINGS.map(t => {
                    const selected = selectedToppings.includes(t);
                    return (
                      <button
                        key={t}
                        onClick={() => toggleTopping(t)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                          selected
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
                        }`}
                      >
                        <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${selected ? "border-white bg-white" : "border-zinc-300"}`}>
                          {selected && <Check className="h-2.5 w-2.5 text-zinc-900" />}
                        </div>
                        <span className="leading-tight">{t}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Qty controls */}
              <div className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-4 py-3">
                {detailQty > 0 ? (
                  <>
                    <button onClick={() => removeFromCart(toppingKey(detail.id, selectedToppings))} className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-zinc-300 text-zinc-600 active:scale-95">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="flex-1 text-center text-xl font-black tabular-nums">{detailQty}</span>
                    <button onClick={() => addToCart(detail, selectedToppings)} className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-white active:scale-95">
                      <Plus className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <button onClick={() => addToCart(detail, selectedToppings)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-sm font-bold text-white hover:bg-zinc-700 active:scale-95">
                    <Plus className="h-4 w-4" /> Add to order · RM {detailTotalPrice.toFixed(2)}
                  </button>
                )}
              </div>

              {totalItems > 0 && (
                <button onClick={() => { setDetail(null); setShowCart(true); }} className="w-full rounded-xl border-2 border-zinc-900 py-3 text-sm font-bold text-zinc-900 hover:bg-zinc-50">
                  View order · RM {totalPrice.toFixed(2)}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
