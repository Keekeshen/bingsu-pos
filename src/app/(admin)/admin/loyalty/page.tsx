"use client";

import { useEffect, useState, useTransition } from "react";
import { Search, Plus, Pencil, Check, X, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

type LoyaltyRule = {
  id: string;
  points_per_rm: number;
  min_spend: number;
  is_active: boolean;
};

type Customer = {
  id: string;
  full_name: string;
  phone: string | null;
  loyalty_points: number;
};

type Reward = {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  discount_rm: number;
  is_active: boolean;
  image_url: string | null;
};

export default function LoyaltyPage() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
      <h1 className="text-xl font-bold text-zinc-900">Loyalty Management</h1>
      <LoyaltyRulesSection />
      <Separator />
      <CustomerPointsSection />
      <Separator />
      <RewardsCatalogueSection />
    </div>
  );
}

function LoyaltyRulesSection() {
  const [rule, setRule] = useState<LoyaltyRule | null>(null);
  const [pointsPerRm, setPointsPerRm] = useState("");
  const [minSpend, setMinSpend] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchRule() {
      const supabase = createClient();
      const { data } = await supabase
        .from("loyalty_rules")
        .select("id, points_per_rm, min_spend, is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setRule(data);
        setPointsPerRm(String(data.points_per_rm));
        setMinSpend(String(data.min_spend ?? 0));
      }
      setLoading(false);
    }
    fetchRule();
  }, []);

  async function handleSave() {
    const ppr = parseFloat(pointsPerRm);
    const ms = parseFloat(minSpend);
    if (isNaN(ppr) || ppr <= 0) { toast.error("Points per RM must be a positive number"); return; }
    if (isNaN(ms) || ms < 0) { toast.error("Minimum spend must be 0 or more"); return; }

    setSaving(true);
    const supabase = createClient();

    if (rule) {
      const { error } = await supabase.from("loyalty_rules").update({ points_per_rm: ppr, min_spend: ms }).eq("id", rule.id);
      if (error) { toast.error("Failed to update rule"); } else { setRule({ ...rule, points_per_rm: ppr, min_spend: ms }); toast.success("Loyalty rule updated"); }
    } else {
      const { data, error } = await supabase.from("loyalty_rules").insert({ points_per_rm: ppr, min_spend: ms, is_active: true }).select().single();
      if (error || !data) { toast.error("Failed to create rule"); } else { setRule(data); toast.success("Loyalty rule created"); }
    }
    setSaving(false);
  }

  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold text-zinc-800">Earning Rules</h2>
      <Card>
        <CardContent className="pt-5">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" />Loading rule…</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="ppr">Points per RM spent</Label>
                <Input id="ppr" type="number" min="0.01" step="0.01" value={pointsPerRm} onChange={(e) => setPointsPerRm(e.target.value)} placeholder="1" />
                <p className="text-xs text-zinc-400">e.g. 1 = 1 point per RM 1.00</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="minSpend">Minimum spend (RM)</Label>
                <Input id="minSpend" type="number" min="0" step="0.01" value={minSpend} onChange={(e) => setMinSpend(e.target.value)} placeholder="0" />
                <p className="text-xs text-zinc-400">0 = no minimum required</p>
              </div>
              <div className="flex items-end">
                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Rule"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function CustomerPointsSection() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [searching, setSearching] = useState(false);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, startSubmit] = useTransition();

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSelected(null);
    const supabase = createClient();
    const { data } = await supabase.from("profiles").select("id, full_name, phone, loyalty_points").eq("role", "client").or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`).limit(10);
    setResults(data ?? []);
    setSearching(false);
  }

  async function handleAdjust() {
    if (!selected) return;
    const d = parseInt(delta, 10);
    if (isNaN(d) || d === 0) { toast.error("Delta must be a non-zero integer"); return; }
    if (!reason.trim()) { toast.error("Reason is required"); return; }

    const supabase = createClient();
    const { error: adjError } = await supabase.from("point_adjustments").insert({ profile_id: selected.id, delta: d, reason: reason.trim() });
    if (adjError) { toast.error("Failed to record adjustment"); return; }

    const newPoints = Math.max(0, selected.loyalty_points + d);
    const { error: profileError } = await supabase.from("profiles").update({ loyalty_points: newPoints }).eq("id", selected.id);
    if (profileError) { toast.error("Adjustment recorded but failed to update balance"); return; }

    const updated = { ...selected, loyalty_points: newPoints };
    setSelected(updated);
    setResults((prev) => prev.map((c) => (c.id === selected.id ? updated : c)));
    setDelta("");
    setReason("");
    toast.success(`${d > 0 ? "+" : ""}${d} points applied to ${selected.full_name}`);
  }

  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold text-zinc-800">Customer Points</h2>
      <div className="flex gap-2">
        <Input placeholder="Search by name or phone…" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="max-w-sm" />
        <Button variant="outline" onClick={handleSearch} disabled={searching || !query.trim()} className="gap-2">
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Search
        </Button>
      </div>
      {results.length > 0 && (
        <div className="rounded-lg border border-zinc-200 divide-y divide-zinc-100 overflow-hidden">
          {results.map((c) => (
            <button key={c.id} onClick={() => setSelected(c)} className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm transition-colors hover:bg-zinc-50 ${selected?.id === c.id ? "bg-zinc-100 font-medium" : ""}`}>
              <div>
                <span className="text-zinc-900">{c.full_name}</span>
                {c.phone && <span className="ml-2 text-zinc-400">{c.phone}</span>}
              </div>
              <Badge variant="secondary" className="tabular-nums">{c.loyalty_points.toLocaleString()} pts</Badge>
            </button>
          ))}
        </div>
      )}
      {results.length === 0 && query && !searching && <p className="text-sm text-zinc-400">No customers found.</p>}
      {selected && (
        <Card className="border-zinc-300">
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="text-sm font-semibold text-zinc-800 flex items-center justify-between">
              <span>Adjust points for <span className="text-zinc-900">{selected.full_name}</span></span>
              <span className="text-base font-bold tabular-nums text-zinc-700">{selected.loyalty_points.toLocaleString()} pts</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="delta">Points delta <span className="text-zinc-400 font-normal">(+ to add, − to deduct)</span></Label>
                <Input id="delta" type="number" placeholder="e.g. 50 or -20" value={delta} onChange={(e) => setDelta(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reason">Reason (required)</Label>
                <Input id="reason" placeholder="Goodwill adjustment, correction…" value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
            </div>
            {delta && !isNaN(parseInt(delta, 10)) && (
              <p className="text-xs text-zinc-500">Balance after adjustment: <span className="font-semibold text-zinc-800 tabular-nums">{Math.max(0, selected.loyalty_points + parseInt(delta, 10)).toLocaleString()} pts</span></p>
            )}
            <Button onClick={() => startSubmit(handleAdjust)} disabled={submitting || !delta || !reason.trim()} className="w-full sm:w-auto">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply Adjustment"}
            </Button>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

type RewardFormState = { name: string; description: string; points_cost: string; discount_rm: string; image_url: string; };
const EMPTY_FORM: RewardFormState = { name: "", description: "", points_cost: "", discount_rm: "", image_url: "" };

function RewardsCatalogueSection() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Reward | null>(null);
  const [form, setForm] = useState<RewardFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchRewards(); }, []);

  async function fetchRewards() {
    const supabase = createClient();
    const { data } = await supabase.from("rewards").select("id, name, description, points_cost, discount_rm, is_active, image_url").order("points_cost", { ascending: true });
    setRewards(data ?? []);
    setLoading(false);
  }

  function openAdd() { setEditTarget(null); setForm(EMPTY_FORM); setDialogOpen(true); }
  function openEdit(reward: Reward) { setEditTarget(reward); setForm({ name: reward.name, description: reward.description ?? "", points_cost: String(reward.points_cost), discount_rm: String(reward.discount_rm), image_url: reward.image_url ?? "" }); setDialogOpen(true); }
  function closeDialog() { setDialogOpen(false); setEditTarget(null); setForm(EMPTY_FORM); }

  async function handleSaveReward() {
    const pointsCost = parseInt(form.points_cost, 10);
    const discountRm = parseFloat(form.discount_rm);
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (isNaN(pointsCost) || pointsCost < 1) { toast.error("Points cost must be at least 1"); return; }
    if (isNaN(discountRm) || discountRm < 0) { toast.error("Discount RM must be 0 or more"); return; }

    setSaving(true);
    const supabase = createClient();
    const payload = { name: form.name.trim(), description: form.description.trim() || null, points_cost: pointsCost, discount_rm: discountRm, image_url: form.image_url.trim() || null };

    if (editTarget) {
      const { error } = await supabase.from("rewards").update(payload).eq("id", editTarget.id);
      if (error) { toast.error("Failed to update reward"); } else { setRewards((prev) => prev.map((r) => r.id === editTarget.id ? { ...r, ...payload } : r)); toast.success("Reward updated"); closeDialog(); }
    } else {
      const { data, error } = await supabase.from("rewards").insert({ ...payload, is_active: true }).select().single();
      if (error || !data) { toast.error("Failed to create reward"); } else { setRewards((prev) => [...prev, data]); toast.success("Reward created"); closeDialog(); }
    }
    setSaving(false);
  }

  async function toggleActive(reward: Reward) {
    const supabase = createClient();
    const next = !reward.is_active;
    const { error } = await supabase.from("rewards").update({ is_active: next }).eq("id", reward.id);
    if (error) { toast.error("Failed to update reward status"); return; }
    setRewards((prev) => prev.map((r) => (r.id === reward.id ? { ...r, is_active: next } : r)));
    toast.success(next ? "Reward activated" : "Reward deactivated");
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-800">Rewards Catalogue</h2>
        <Button size="sm" className="gap-1.5" onClick={openAdd}><Plus className="h-4 w-4" />Add Reward</Button>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" />Loading rewards…</div>
      ) : rewards.length === 0 ? (
        <p className="text-sm text-zinc-400">No rewards yet. Add your first one.</p>
      ) : (
        <div className="rounded-lg border border-zinc-200 overflow-hidden divide-y divide-zinc-100">
          {rewards.map((reward) => (
            <div key={reward.id} className="flex items-center gap-4 px-4 py-3">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                {reward.image_url
                  ? <Image src={reward.image_url} alt={reward.name} fill className="object-cover" unoptimized />
                  : <div className="flex h-full items-center justify-center"><ImageIcon className="h-4 w-4 text-zinc-300" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-900 truncate">{reward.name}</span>
                  <Badge variant={reward.is_active ? "default" : "secondary"} className="text-[10px] px-1.5">{reward.is_active ? "Active" : "Inactive"}</Badge>
                </div>
                {reward.description && <p className="text-xs text-zinc-400 truncate mt-0.5">{reward.description}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold tabular-nums text-zinc-800">{reward.points_cost.toLocaleString()} pts</p>
                <p className="text-xs text-zinc-400 tabular-nums">RM {reward.discount_rm.toFixed(2)} off</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-700" onClick={() => openEdit(reward)} aria-label="Edit reward"><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className={`h-8 w-8 ${reward.is_active ? "text-zinc-400 hover:text-red-500" : "text-zinc-400 hover:text-emerald-600"}`} onClick={() => toggleActive(reward)} aria-label={reward.is_active ? "Deactivate reward" : "Activate reward"}>
                  {reward.is_active ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editTarget ? "Edit Reward" : "Add New Reward"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            {/* Image preview */}
            <div className="space-y-1.5">
              <Label htmlFor="rImage">Photo URL <span className="font-normal text-zinc-400">(optional)</span></Label>
              <Input id="rImage" placeholder="https://..." value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} />
              {form.image_url.trim() ? (
                <div className="relative h-36 w-full overflow-hidden rounded-xl bg-zinc-100">
                  <Image src={form.image_url.trim()} alt="Preview" fill className="object-cover" onError={() => {}} unoptimized />
                </div>
              ) : (
                <div className="flex h-20 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 text-zinc-400">
                  <ImageIcon className="h-5 w-5" />
                  <span className="text-xs">Paste an image URL to preview</span>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rName">Name</Label>
              <Input id="rName" placeholder="Free Bingsu" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rDesc">Description <span className="font-normal text-zinc-400">(optional)</span></Label>
              <Textarea id="rDesc" placeholder="Redeem for a free regular bingsu of your choice" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rPoints">Points cost</Label>
                <Input id="rPoints" type="number" min="1" placeholder="500" value={form.points_cost} onChange={(e) => setForm((f) => ({ ...f, points_cost: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rDiscount">Discount (RM)</Label>
                <Input id="rDiscount" type="number" min="0" step="0.01" placeholder="10.00" value={form.discount_rm} onChange={(e) => setForm((f) => ({ ...f, discount_rm: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>Cancel</Button>
            <Button onClick={handleSaveReward} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editTarget ? "Save Changes" : "Create Reward"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
