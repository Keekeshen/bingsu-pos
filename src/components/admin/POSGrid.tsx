"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { CartItem } from "@/lib/hooks/useCart";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ImageIcon, Check } from "lucide-react";

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
  code: string | null;
  name: string;
  price: number;
  image_url: string | null;
  category: string;
  is_available: boolean;
};

type Props = {
  onAddItem: (product: Omit<CartItem, "quantity">) => void;
};

const ALL_CATEGORY = "All";

export default function POSGrid({ onAddItem }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
  const [toppingProduct, setToppingProduct] = useState<Product | null>(null);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);

  useEffect(() => {
    async function fetchProducts() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .select("id, code, name, price, image_url, category, is_available")
        .eq("is_available", true);
      if (!error && data) {
        // Sort: products with a code first (by code), then by name for those without
        const sorted = [...data].sort((a, b) => {
          const ca = a.code ?? "";
          const cb = b.code ?? "";
          if (ca && cb) return ca.localeCompare(cb, undefined, { numeric: true, sensitivity: "base" });
          if (ca) return -1;
          if (cb) return 1;
          return a.name.localeCompare(b.name);
        });
        setProducts(sorted);
      }
      setLoading(false);
    }
    fetchProducts();
  }, []);

  const categories = [ALL_CATEGORY, ...Array.from(new Set(products.map((p) => p.category))).sort()];
  // products are already sorted by code; just filter, don't re-sort
  const filtered = activeCategory === ALL_CATEGORY ? products : products.filter((p) => p.category === activeCategory);

  function openToppingModal(product: Product) {
    setToppingProduct(product);
    setSelectedToppings([]);
  }

  function toggleTopping(t: string) {
    setSelectedToppings(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  function confirmAdd() {
    if (!toppingProduct) return;
    const toppingCost = selectedToppings.length * TOPPING_PRICE;
    const unitPrice = +(toppingProduct.price + toppingCost).toFixed(2);
    const compositeId = selectedToppings.length > 0
      ? `${toppingProduct.id}|${[...selectedToppings].sort().join(",")}`
      : toppingProduct.id;
    const displayName = selectedToppings.length > 0
      ? `${toppingProduct.name} (+${selectedToppings.join(", ")})`
      : toppingProduct.name;
    onAddItem({
      product_id: compositeId,
      base_product_id: toppingProduct.id,
      name: displayName,
      price: unitPrice,
      toppings: selectedToppings.length > 0 ? selectedToppings : undefined,
    });
    setToppingProduct(null);
  }

  const toppingTotalPrice = toppingProduct
    ? +(toppingProduct.price + selectedToppings.length * TOPPING_PRICE).toFixed(2)
    : 0;

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="shrink-0 pb-3 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-2 bg-zinc-100 rounded-xl p-2 w-max min-w-full">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-28 shrink-0 rounded-xl" />)
              : categories.map((cat) => (
                  <button key={cat} onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "h-12 px-5 shrink-0 rounded-xl text-base font-semibold whitespace-nowrap transition-all",
                      activeCategory === cat
                        ? "bg-white shadow text-zinc-900"
                        : "text-zinc-500 hover:text-zinc-800"
                    )}>
                    {cat}
                  </button>
                ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pb-4">
          {loading ? (
            <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-zinc-400">No products available</div>
          ) : (
            <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} onAdd={() => openToppingModal(product)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Topping selection dialog */}
      <Dialog open={!!toppingProduct} onOpenChange={(o) => !o && setToppingProduct(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{toppingProduct?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Product info */}
            <div className="flex items-center gap-3">
              {toppingProduct?.image_url && (
                <div className="relative h-16 w-16 rounded-xl overflow-hidden shrink-0 bg-zinc-100">
                  <Image src={toppingProduct.image_url} alt={toppingProduct.name} fill className="object-cover" />
                </div>
              )}
              <div>
                <p className="text-sm text-zinc-500">Base price</p>
                <p className="text-xl font-bold text-zinc-900">RM {toppingProduct?.price.toFixed(2)}</p>
              </div>
            </div>

            {/* Toppings grid */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-zinc-800">Extra Toppings</p>
                <span className="text-xs text-zinc-400">+RM {TOPPING_PRICE.toFixed(2)} each</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {TOPPINGS.map(t => {
                  const selected = selectedToppings.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTopping(t)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                        selected
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-400"
                      )}
                    >
                      <div className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                        selected ? "border-white bg-white" : "border-zinc-300"
                      )}>
                        {selected && <Check className="h-2.5 w-2.5 text-zinc-900" />}
                      </div>
                      <span className="leading-tight">{t}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Running total */}
            {selectedToppings.length > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-2.5 text-sm">
                <span className="text-zinc-500">
                  {selectedToppings.length} topping{selectedToppings.length > 1 ? "s" : ""}
                  &nbsp;+RM {(selectedToppings.length * TOPPING_PRICE).toFixed(2)}
                </span>
                <span className="font-bold text-zinc-900">Total RM {toppingTotalPrice.toFixed(2)}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setToppingProduct(null)}>Cancel</Button>
            <Button onClick={confirmAdd}>
              Add to Cart · RM {toppingTotalPrice.toFixed(2)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void; }) {
  return (
    <button
      onClick={onAdd}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200",
        "bg-white text-left shadow-sm transition-all duration-150",
        "hover:border-zinc-400 hover:shadow-md active:scale-95"
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-zinc-100">
        {product.image_url ? (
          <Image src={product.image_url} alt={product.name} fill sizes="(max-width: 768px) 33vw, 25vw" className="object-cover transition-transform duration-200 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageIcon className="h-8 w-8 text-zinc-300" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5 p-2.5">
        {product.code && (
          <span className="text-[10px] font-bold font-mono text-zinc-400 leading-none mb-0.5">{product.code}</span>
        )}
        <span className="line-clamp-2 text-xs font-medium leading-tight text-zinc-800">{product.name}</span>
        <span className="text-sm font-bold text-zinc-900">RM {product.price.toFixed(2)}</span>
      </div>
    </button>
  );
}
