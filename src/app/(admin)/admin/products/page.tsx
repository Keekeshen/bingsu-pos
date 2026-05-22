"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Image from "next/image";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  sort_order: number;
  is_available: boolean;
  image_url: string | null;
};

type ProductForm = {
  name: string;
  description: string;
  price: string;
  category: string | null;
  sort_order: string;
  is_available: boolean;
  image_url: string | null;
  imageFile: File | null;
  imagePreview: string | null;
};

const EMPTY_FORM: ProductForm = {
  name: "",
  description: "",
  price: "",
  category: "bingsu",
  sort_order: "",
  is_available: true,
  image_url: null,
  imageFile: null,
  imagePreview: null,
};

const DEFAULT_CATEGORIES = ["bingsu", "topping", "drink", "other"];
const STORAGE_BUCKET = "product-images";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [reordering, setReordering] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => { fetchProducts(); }, []);

  async function fetchProducts() {
    const supabase = createClient();
    const { data } = await supabase
      .from("products")
      .select("id, name, description, price, category, sort_order, is_available, image_url")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    setProducts(data ?? []);
    setLoading(false);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = products.findIndex((p) => p.id === active.id);
    const newIndex = products.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(products, oldIndex, newIndex);

    setProducts(reordered);
    setReordering(true);

    const supabase = createClient();
    const updates = reordered.map((p, i) =>
      supabase.from("products").update({ sort_order: i + 1 }).eq("id", p.id)
    );
    const results = await Promise.all(updates);
    const failed = results.some((r) => r.error);

    setReordering(false);
    if (failed) { toast.error("Failed to save new order"); fetchProducts(); }
  }

  async function toggleAvailable(product: Product) {
    const next = !product.is_available;
    setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, is_available: next } : p));
    const supabase = createClient();
    const { error } = await supabase.from("products").update({ is_available: next }).eq("id", product.id);
    if (error) {
      toast.error("Failed to update availability");
      setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, is_available: !next } : p));
    }
  }

  async function handleDelete(product: Product) {
    const supabase = createClient();
    if (product.image_url) {
      const path = product.image_url.split(`/${STORAGE_BUCKET}/`).pop();
      if (path) await supabase.storage.from(STORAGE_BUCKET).remove([path]);
    }
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (error) { toast.error("Failed to delete product"); return; }
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
    toast.success(`"${product.name}" deleted`);
    setDeleteTarget(null);
  }

  function openAdd() { setEditTarget(null); setFormOpen(true); }
  function openEdit(product: Product) { setEditTarget(product); setFormOpen(true); }

  function onSaved(product: Product, isNew: boolean) {
    if (isNew) { setProducts((prev) => [...prev, product]); }
    else { setProducts((prev) => prev.map((p) => (p.id === product.id ? product : p))); }
    setFormOpen(false);
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-zinc-900">Products</h1>
          {reordering && <span className="flex items-center gap-1 text-xs text-zinc-400"><Loader2 className="h-3 w-3 animate-spin" />Saving order…</span>}
        </div>
        <Button className="gap-1.5" onClick={openAdd}><Plus className="h-4 w-4" />Add Product</Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" />Loading products…</div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-200 py-16 text-center">
          <span className="text-4xl">🍧</span>
          <p className="text-sm font-medium text-zinc-600">No products yet</p>
          <Button size="sm" onClick={openAdd}>Add your first product</Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <div className="grid grid-cols-[2rem_3.5rem_1fr_7rem_6rem_5rem_6rem] items-center gap-3 border-b border-zinc-100 bg-zinc-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
            <span /><span>Image</span><span>Name</span><span>Category</span>
            <span className="text-right">Price</span><span className="text-center">Available</span><span className="text-right">Actions</span>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={products.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              {products.map((product) => (
                <SortableRow key={product.id} product={product} onToggleAvailable={() => toggleAvailable(product)} onEdit={() => openEdit(product)} onDelete={() => setDeleteTarget(product)} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      <ProductFormDialog open={formOpen} editTarget={editTarget} onClose={() => setFormOpen(false)} onSaved={onSaved} nextSortOrder={products.length + 1} existingCategories={Array.from(new Set([...DEFAULT_CATEGORIES, ...products.map(p => p.category).filter(Boolean)]))} />
      <DeleteConfirmDialog product={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />
    </div>
  );
}

function SortableRow({ product, onToggleAvailable, onEdit, onDelete }: { product: Product; onToggleAvailable: () => void; onEdit: () => void; onDelete: () => void; }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : undefined };

  return (
    <div ref={setNodeRef} style={style} className="grid grid-cols-[2rem_3.5rem_1fr_7rem_6rem_5rem_6rem] items-center gap-3 border-b border-zinc-100 px-4 py-3 last:border-0 bg-white">
      <button {...attributes} {...listeners} className="flex cursor-grab items-center justify-center text-zinc-300 hover:text-zinc-500 active:cursor-grabbing focus:outline-none" aria-label="Drag to reorder">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="h-10 w-10 overflow-hidden rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
        {product.image_url ? (
          <Image src={product.image_url} alt={product.name} width={40} height={40} className="h-10 w-10 object-cover" />
        ) : (
          <ImageIcon className="h-4 w-4 text-zinc-300" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-zinc-900">{product.name}</p>
        {product.description && <p className="truncate text-xs text-zinc-400">{product.description}</p>}
      </div>
      <Badge variant="secondary" className="capitalize w-fit text-xs">{product.category}</Badge>
      <p className="text-right text-sm font-semibold tabular-nums text-zinc-800">RM {product.price.toFixed(2)}</p>
      <div className="flex justify-center">
        <Switch checked={product.is_available} onCheckedChange={onToggleAvailable} aria-label={`Toggle availability for ${product.name}`} />
      </div>
      <div className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-700" onClick={onEdit} aria-label={`Edit ${product.name}`}><Pencil className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-500" onClick={onDelete} aria-label={`Delete ${product.name}`}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}

function ProductFormDialog({ open, editTarget, onClose, onSaved, nextSortOrder, existingCategories }: { open: boolean; editTarget: Product | null; onClose: () => void; onSaved: (product: Product, isNew: boolean) => void; nextSortOrder: number; existingCategories: string[]; }) {
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [customCat, setCustomCat] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCustomCat("");
      setShowCustom(false);
      if (editTarget) {
        setForm({ name: editTarget.name, description: editTarget.description ?? "", price: String(editTarget.price), category: editTarget.category, sort_order: String(editTarget.sort_order), is_available: editTarget.is_available, image_url: editTarget.image_url, imageFile: null, imagePreview: null });
      } else {
        setForm({ ...EMPTY_FORM, sort_order: String(nextSortOrder) });
      }
    }
  }, [open, editTarget, nextSortOrder]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be smaller than 5 MB"); return; }
    const preview = URL.createObjectURL(file);
    setForm((f) => ({ ...f, imageFile: file, imagePreview: preview }));
  }

  async function uploadImage(file: File): Promise<string | null> {
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
    if (error || !data) { toast.error("Image upload failed"); return null; }
    const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(data.path);
    return publicUrl;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const price = parseFloat(form.price);
    const sort_order = parseInt(form.sort_order, 10);
    if (!form.name.trim()) return toast.error("Name is required");
    if (isNaN(price) || price < 0) return toast.error("Enter a valid price");
    if (isNaN(sort_order)) return toast.error("Enter a valid sort order");

    setSaving(true);
    const supabase = createClient();
    let image_url = form.image_url;
    if (form.imageFile) {
      const url = await uploadImage(form.imageFile);
      if (!url) { setSaving(false); return; }
      image_url = url;
    }

    const payload = { name: form.name.trim(), description: form.description.trim() || null, price, category: form.category, sort_order, is_available: form.is_available, image_url };

    if (editTarget) {
      const { data, error } = await supabase.from("products").update(payload).eq("id", editTarget.id).select().single();
      if (error || !data) { toast.error("Failed to update product"); } else { toast.success("Product updated"); onSaved(data as Product, false); }
    } else {
      const { data, error } = await supabase.from("products").insert(payload).select().single();
      if (error || !data) { toast.error("Failed to create product"); } else { toast.success("Product created"); onSaved(data as Product, true); }
    }
    setSaving(false);
  }

  const previewSrc = form.imagePreview ?? form.image_url;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editTarget ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Product Image</Label>
            <div onClick={() => fileInputRef.current?.click()} className="relative flex h-32 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 transition-colors hover:border-zinc-400">
              {previewSrc ? (
                <Image src={previewSrc} alt="Preview" fill className="object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-zinc-400">
                  <ImageIcon className="h-8 w-8" />
                  <span className="text-xs">Click to upload</span>
                  <span className="text-[10px]">PNG, JPG up to 5 MB</span>
                </div>
              )}
              {previewSrc && <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity hover:opacity-100"><span className="text-xs font-medium text-white">Change image</span></div>}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pName">Name</Label>
            <Input id="pName" placeholder="Original Bingsu" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pDesc">Description <span className="font-normal text-zinc-400">(optional)</span></Label>
            <Textarea id="pDesc" placeholder="Fluffy shaved ice with your choice of toppings" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pPrice">Price (RM)</Label>
              <Input id="pPrice" type="number" min="0" step="0.01" placeholder="12.90" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pCategory">Category</Label>
              {showCustom ? (
                <div className="flex gap-1.5">
                  <Input
                    autoFocus
                    placeholder="e.g. special, set meal…"
                    value={customCat}
                    onChange={(e) => {
                      setCustomCat(e.target.value);
                      setForm((f) => ({ ...f, category: e.target.value.trim().toLowerCase() || "other" }));
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" className="shrink-0 px-2" onClick={() => { setShowCustom(false); setCustomCat(""); setForm((f) => ({ ...f, category: existingCategories[0] ?? "bingsu" })); }}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Select
                  value={form.category ?? ""}
                  onValueChange={(v) => {
                    if (v === "__new__") { setShowCustom(true); setCustomCat(""); }
                    else setForm((f) => ({ ...f, category: v }));
                  }}
                >
                  <SelectTrigger id="pCategory"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {existingCategories.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                    <SelectItem value="__new__" className="text-zinc-400 italic">+ New category…</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="pSort">Sort Order</Label>
              <Input id="pSort" type="number" min="1" placeholder="1" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3 pb-1">
              <Switch id="pAvailable" checked={form.is_available} onCheckedChange={(v) => setForm((f) => ({ ...f, is_available: v }))} />
              <Label htmlFor="pAvailable" className="cursor-pointer">Available for sale</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editTarget ? "Save Changes" : "Create Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirmDialog({ product, onClose, onConfirm }: { product: Product | null; onClose: () => void; onConfirm: (product: Product) => Promise<void>; }) {
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    if (!product) return;
    setDeleting(true);
    await onConfirm(product);
    setDeleting(false);
  }

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && !deleting && onClose()}>
      {product && (
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Product?</DialogTitle></DialogHeader>
          <p className="text-sm text-zinc-500">Are you sure you want to permanently delete <span className="font-semibold text-zinc-800">{product.name}</span>? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
