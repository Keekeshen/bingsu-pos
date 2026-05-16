"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { CartItem } from "@/lib/hooks/useCart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";

type Product = {
  id: string;
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

  useEffect(() => {
    async function fetchProducts() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, image_url, category, is_available")
        .eq("is_available", true)
        .order("category")
        .order("name");
      if (!error && data) setProducts(data);
      setLoading(false);
    }
    fetchProducts();
  }, []);

  const categories = [ALL_CATEGORY, ...Array.from(new Set(products.map((p) => p.category))).sort()];
  const filtered = activeCategory === ALL_CATEGORY ? products : products.filter((p) => p.category === activeCategory);

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="flex-wrap h-auto gap-1 bg-zinc-100 p-1">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-20 rounded-md" />)
            : categories.map((cat) => <TabsTrigger key={cat} value={cat} className="text-xs">{cat}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      <div className="flex-1 overflow-y-auto pb-4">
        {loading ? (
          <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-zinc-400">No products available</div>
        ) : (
          <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} onAdd={() => onAddItem({ product_id: product.id, name: product.name, price: product.price })} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void; }) {
  const [pressed, setPressed] = useState(false);

  function handleClick() {
    onAdd();
    setPressed(true);
    setTimeout(() => setPressed(false), 150);
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200",
        "bg-white text-left shadow-sm transition-all duration-150",
        "hover:border-zinc-400 hover:shadow-md active:scale-95",
        pressed && "ring-2 ring-zinc-900"
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
        <span className="line-clamp-2 text-xs font-medium leading-tight text-zinc-800">{product.name}</span>
        <span className="text-sm font-bold text-zinc-900">RM {product.price.toFixed(2)}</span>
      </div>
    </button>
  );
}
