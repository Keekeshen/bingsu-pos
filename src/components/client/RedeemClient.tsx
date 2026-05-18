"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Gift, CheckCircle2, Loader2, Lock, ImageIcon, X, ChevronRight } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import Image from "next/image";

type Reward = { id: string; name: string; description: string | null; points_cost: number; discount_rm: number; image_url?: string | null };
type RedemptionSuccess = { redemption_code: string; reward_name: string; discount_rm: number };
type Props = { initialPoints: number; rewards: Reward[] };

export default function RedeemClient({ initialPoints, rewards }: Props) {
  const [points, setPoints] = useState(initialPoints);
  const [detail, setDetail] = useState<Reward | null>(null);
  const [confirming, setConfirming] = useState<Reward | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [success, setSuccess] = useState<RedemptionSuccess | null>(null);

  async function handleRedeem() {
    if (!confirming) return;
    setRedeeming(true);
    const res = await fetch("/api/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reward_id: confirming.id }) });
    setRedeeming(false);
    if (!res.ok) { const body = await res.json().catch(() => ({})); toast.error(body?.error ?? "Redemption failed"); setConfirming(null); return; }
    const data: RedemptionSuccess = await res.json();
    setPoints(p => Math.max(0, p - confirming.points_cost));
    setConfirming(null);
    setDetail(null);
    setSuccess(data);
  }

  return (
    <>
      {/* Balance bar */}
      <div className="flex items-center justify-between rounded-2xl bg-zinc-900 px-5 py-4 text-white">
        <div>
          <p className="text-xs text-zinc-400">Your balance</p>
          <p className="text-3xl font-extrabold tabular-nums leading-tight">
            {points.toLocaleString()}
            <span className="ml-1 text-base font-semibold text-zinc-400">pts</span>
          </p>
        </div>
        <Gift className="h-8 w-8 text-zinc-600" />
      </div>

      {rewards.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-200 bg-white py-14 text-center">
          <Gift className="h-10 w-10 text-zinc-300" />
          <p className="text-sm font-medium text-zinc-600">No rewards available yet</p>
          <p className="text-xs text-zinc-400">Check back soon!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rewards.map(reward => {
            const affordable = points >= reward.points_cost;
            const ptsNeeded = reward.points_cost - points;
            return (
              <button
                key={reward.id}
                className={`relative flex w-full items-center gap-3 rounded-xl border bg-white px-3 py-2.5 shadow-sm transition-all text-left ${affordable ? "border-zinc-200 active:bg-zinc-50" : "border-zinc-100 opacity-60"}`}
                onClick={() => setDetail(reward)}
              >
                {/* Thumbnail */}
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                  {reward.image_url ? (
                    <Image src={reward.image_url} alt={reward.name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-zinc-300" />
                    </div>
                  )}
                  {!affordable && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50 rounded-lg">
                      <Lock className="h-4 w-4 text-white/80" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 leading-tight truncate">{reward.name}</p>
                  {reward.description && (
                    <p className="text-[11px] text-zinc-400 leading-snug line-clamp-1 mt-0.5">{reward.description}</p>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[11px] font-bold tabular-nums text-zinc-600">{reward.points_cost.toLocaleString()} pts</span>
                  </div>
                  {!affordable && (
                    <p className="text-[10px] text-red-400 mt-0.5">{ptsNeeded.toLocaleString()} more pts needed</p>
                  )}
                </div>

                <ChevronRight className="h-4 w-4 text-zinc-300 shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {/* Detail bottom sheet */}
      {detail && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setDetail(null)} />

          {/* Sheet */}
          <div className="relative z-10 flex max-h-[90dvh] flex-col overflow-hidden rounded-t-3xl bg-white">
            {/* Hero image */}
            <div className="relative h-72 w-full shrink-0 bg-zinc-100">
              {detail.image_url ? (
                <Image src={detail.image_url} alt={detail.name} fill className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <ImageIcon className="h-16 w-16 text-zinc-300" />
                </div>
              )}
              {/* Close button */}
              <button
                onClick={() => setDetail(null)}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
              >
                <X className="h-4 w-4" />
              </button>
              {/* Points badge */}
              <div className="absolute bottom-3 left-4 rounded-full bg-zinc-900/80 backdrop-blur-sm px-3 py-1.5 text-xs font-bold text-white tabular-nums">
                {detail.points_cost.toLocaleString()} pts
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-4 overflow-y-auto p-5">
              <div>
                <h2 className="text-xl font-black text-zinc-900">{detail.name}</h2>
                {detail.description && (
                  <p className="mt-1.5 text-sm text-zinc-500 leading-relaxed">{detail.description}</p>
                )}
              </div>

              {/* Value row */}
              <div className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-4 py-3">
                <div className="flex-1">
                  <p className="text-xs text-zinc-400">Points required</p>
                  <p className="text-lg font-black tabular-nums text-zinc-900">{detail.points_cost.toLocaleString()} <span className="text-sm font-semibold text-zinc-400">pts</span></p>
                </div>
                <div className="h-8 w-px bg-zinc-200" />
                <div className="flex-1">
                  <p className="text-xs text-zinc-400">Your balance</p>
                  <p className={`text-lg font-black tabular-nums ${points >= detail.points_cost ? "text-zinc-900" : "text-red-500"}`}>{points.toLocaleString()}</p>
                </div>
              </div>

              {points < detail.points_cost && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-red-400 shrink-0" />
                  <p className="text-sm text-red-600">
                    You need <span className="font-bold">{(detail.points_cost - points).toLocaleString()} more pts</span> to unlock this reward.
                  </p>
                </div>
              )}
            </div>

            {/* Action */}
            <div className="shrink-0 border-t border-zinc-100 px-5 py-4" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
              <Button
                className="w-full h-12 text-base font-bold"
                disabled={points < detail.points_cost}
                onClick={() => { setConfirming(detail); }}
              >
                {points >= detail.points_cost ? "Redeem Now" : "Not Enough Points"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      <Dialog open={!!confirming} onOpenChange={o => !o && !redeeming && setConfirming(null)}>
        {confirming && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Confirm Redemption</DialogTitle>
              <DialogDescription>
                Redeem <span className="font-semibold text-zinc-800">{confirming.name}</span> for{" "}
                <span className="font-semibold text-zinc-800 tabular-nums">{confirming.points_cost.toLocaleString()} pts</span>?
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-4 py-3 text-sm space-y-1">
              <div className="flex justify-between text-zinc-500"><span>Current balance</span><span className="tabular-nums">{points.toLocaleString()} pts</span></div>
              <div className="flex justify-between text-zinc-500"><span>Cost</span><span className="tabular-nums text-red-500">-{confirming.points_cost.toLocaleString()} pts</span></div>
              <div className="flex justify-between font-semibold text-zinc-800 border-t border-zinc-200 pt-1 mt-1">
                <span>Remaining</span><span className="tabular-nums">{(points - confirming.points_cost).toLocaleString()} pts</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirming(null)} disabled={redeeming}>Cancel</Button>
              <Button onClick={handleRedeem} disabled={redeeming}>
                {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Success dialog */}
      <Dialog open={!!success} onOpenChange={o => !o && setSuccess(null)}>
        {success && (
          <DialogContent className="max-w-sm text-center">
            <DialogHeader className="items-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-1" />
              <DialogTitle>Reward Redeemed!</DialogTitle>
              <DialogDescription>
                Show this QR code to the cashier to claim your <span className="font-semibold text-zinc-800">{success.reward_name}</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 p-5">
              <QRCodeSVG
                value={success.redemption_code}
                size={180}
                bgColor="#f0fdf4"
                fgColor="#065f46"
                level="M"
              />
              <p className="font-mono text-lg font-bold tracking-widest text-emerald-700">{success.redemption_code}</p>
            </div>

            <p className="text-xs text-zinc-400">Let the cashier scan or type this code. Valid for one use only.</p>
            <Button className="w-full" onClick={() => setSuccess(null)}>Done</Button>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
