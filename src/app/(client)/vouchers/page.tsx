"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Gift, Ticket, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

type Voucher = {
  id: string;
  code: string;
  type: string;
  label: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  is_used: boolean;
  max_uses: number;
  uses_remaining: number;
  expires_at: string | null;
  created_at: string;
};

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tab, setTab] = useState<"available" | "used">("available");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Silently try to issue a birthday voucher if today is the user's birthday
      fetch("/api/birthday-voucher", { method: "POST" }).catch(() => {});

      const { data, error } = await supabase
        .from("vouchers")
        .select("*")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });
      if (error) { toast.error("Failed to load vouchers"); setLoading(false); return; }
      setVouchers(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  function isExpired(v: Voucher) {
    if (!v.expires_at) return false;
    return new Date(v.expires_at) < new Date();
  }
  const available = vouchers.filter(v => !v.is_used && v.uses_remaining > 0 && !isExpired(v));
  const used = vouchers.filter(v => v.is_used || v.uses_remaining <= 0 || isExpired(v));
  const displayed = tab === "available" ? available : used;

  function discountLabel(v: Voucher) {
    if (v.discount_type === "free_item") return "Free Item";
    if (v.discount_type === "fixed") return `RM${v.discount_value.toFixed(2)} OFF`;
    if (v.discount_type === "percentage") return `${v.discount_value}% OFF`;
    return v.label;
  }

  function discountColor(v: Voucher) {
    if (v.type === "free_drink") return "from-pink-500 to-rose-500";
    if (v.discount_type === "fixed") return "from-violet-500 to-purple-600";
    return "from-emerald-500 to-teal-600";
  }

  const isFullyUsed = (v: Voucher) => v.is_used || v.uses_remaining <= 0 || isExpired(v);

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-100 px-4 pt-5 pb-4">
        <h1 className="text-lg font-black text-zinc-900">My Vouchers</h1>
        <p className="text-xs text-zinc-400 mt-0.5">{available.length} available · {used.length} used</p>
      </div>

      <div className="flex border-b border-zinc-200 bg-white px-4">
        {(["available", "used"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors border-b-2 ${tab === t ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400"}`}
          >
            {t === "available" ? `Available (${available.length})` : `Used (${used.length})`}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 px-4 py-4">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-zinc-100" />)
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
            <Ticket className="h-12 w-12 mb-3" />
            <p className="text-sm font-medium">{tab === "available" ? "No vouchers available" : "No used vouchers"}</p>
            {tab === "available" && <p className="text-xs mt-1 text-center px-6">New members receive welcome vouchers automatically</p>}
          </div>
        ) : (
          displayed.map(v => {
            const isOpen = expanded === v.id;
            const fullyUsed = isFullyUsed(v);
            const isMultiUse = v.max_uses > 1;

            return (
              <div key={v.id} className={`overflow-hidden rounded-2xl border shadow-sm ${fullyUsed ? "border-zinc-100 bg-zinc-50" : "border-zinc-200 bg-white"}`}>
                <button className="w-full text-left" onClick={() => setExpanded(isOpen ? null : v.id)}>
                  <div className="flex items-stretch">
                    <div className={`w-2 shrink-0 bg-gradient-to-b ${fullyUsed ? "from-zinc-300 to-zinc-400" : discountColor(v)}`} />
                    <div className="flex flex-1 items-center gap-3 px-4 py-4">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${fullyUsed ? "from-zinc-200 to-zinc-300" : discountColor(v)}`}>
                        {v.type === "free_drink"
                          ? <span className="text-lg">🥤</span>
                          : <Gift className={`h-5 w-5 ${fullyUsed ? "text-zinc-500" : "text-white"}`} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold ${fullyUsed ? "text-zinc-400" : "text-zinc-900"}`}>{v.label}</p>
                        <p className={`text-xs mt-0.5 ${fullyUsed ? "text-zinc-400" : "text-zinc-500"}`}>
                          {v.description ?? discountLabel(v)}
                        </p>
                        {v.expires_at && !isExpired(v) && (
                          <p className="text-[10px] text-amber-500 mt-0.5 font-medium">
                            Expires {new Date(v.expires_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        )}
                        {isExpired(v) && (
                          <p className="text-[10px] text-red-400 mt-0.5 font-semibold">Expired</p>
                        )}
                        {isMultiUse && !fullyUsed && (
                          <div className="mt-1.5">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[10px] text-zinc-400">{v.uses_remaining}/{v.max_uses} uses left</span>
                            </div>
                            <div className="h-1 w-full rounded-full bg-zinc-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${discountColor(v)}`}
                                style={{ width: `${(v.uses_remaining / v.max_uses) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {isMultiUse && fullyUsed && (
                          <p className="text-[10px] text-zinc-400 mt-0.5">All {v.max_uses} uses redeemed</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {fullyUsed
                          ? <CheckCircle2 className="h-5 w-5 text-zinc-400" />
                          : <span className={`rounded-full bg-gradient-to-r px-2.5 py-1 text-xs font-bold text-white ${discountColor(v)}`}>{discountLabel(v)}</span>}
                        {isOpen ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                      </div>
                    </div>
                  </div>
                </button>

                {isOpen && !fullyUsed && (
                  <div className="border-t border-dashed border-zinc-200 px-4 py-5 flex flex-col items-center gap-3 bg-zinc-50">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Show to cashier to redeem</p>
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <QRCodeSVG value={v.code} size={160} level="M" />
                    </div>
                    <p className="font-mono text-sm font-bold tracking-widest text-zinc-700">{v.code}</p>
                    {isMultiUse && (
                      <p className="text-xs text-zinc-500">
                        <span className="font-semibold text-zinc-700">{v.uses_remaining}</span> of {v.max_uses} uses remaining
                      </p>
                    )}
                    {v.expires_at && (
                      <p className="text-xs text-zinc-400">Expires: {new Date(v.expires_at).toLocaleDateString("en-MY")}</p>
                    )}
                    {/* T&C */}
                    <div className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Terms &amp; Conditions</p>
                      <p className="text-xs text-zinc-500 leading-relaxed">{v.description ?? "Valid at Koori Dessert outlets."}</p>
                    </div>
                  </div>
                )}

                {isOpen && fullyUsed && (
                  <div className="border-t border-dashed border-zinc-100 px-4 py-4 flex items-center justify-center gap-2 text-zinc-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <p className="text-sm">All uses have been redeemed</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
