"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Gift, CheckCircle2, Loader2, Lock, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import Image from "next/image";

type Reward = { id: string; name: string; description: string | null; points_cost: number; discount_rm: number; image_url?: string | null };
type RedemptionSuccess = { redemption_code: string; reward_name: string; discount_rm: number };
type Props = { initialPoints: number; rewards: Reward[] };

export default function RedeemClient({ initialPoints, rewards }: Props) {
  const [points, setPoints] = useState(initialPoints);
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
        <div className="grid grid-cols-2 gap-3">
          {rewards.map(reward => {
            const affordable = points >= reward.points_cost;
            const ptsNeeded = reward.points_cost - points;
            return (
              <div
                key={reward.id}
                className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm flex flex-col transition-all ${affordable ? "border-zinc-200" : "border-zinc-100 opacity-70"}`}
              >
                {/* Image */}
                <div className="relative aspect-square w-full bg-zinc-100 overflow-hidden">
                  {reward.image_url ? (
                    <Image src={reward.image_url} alt={reward.name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageIcon className="h-10 w-10 text-zinc-300" />
                    </div>
                  )}

                  {/* Points badge */}
                  <div className="absolute top-2 left-2 rounded-full bg-zinc-900/80 backdrop-blur-sm px-2 py-1 text-[10px] font-bold tabular-nums text-white">
                    {reward.points_cost.toLocaleString()} pts
                  </div>

                  {/* Locked overlay */}
                  {!affordable && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-zinc-900/50 backdrop-blur-[1px]">
                      <Lock className="h-6 w-6 text-white/80" />
                      <p className="text-[10px] font-semibold text-white/80 text-center px-2">
                        {ptsNeeded.toLocaleString()} more pts
                      </p>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <div>
                    <p className="text-sm font-bold text-zinc-900 leading-tight">{reward.name}</p>
                    {reward.description && (
                      <p className="mt-0.5 text-[11px] text-zinc-500 leading-relaxed line-clamp-2">{reward.description}</p>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-emerald-600">RM {reward.discount_rm.toFixed(2)} OFF</p>
                  <Button
                    size="sm"
                    className="w-full h-8 text-xs mt-auto"
                    disabled={!affordable}
                    onClick={() => setConfirming(reward)}
                  >
                    {affordable ? "Redeem" : "Locked"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm dialog */}
      <Dialog open={!!confirming} onOpenChange={o => !o && !redeeming && setConfirming(null)}>
        {confirming && (
          <DialogContent className="max-w-sm">
            {confirming.image_url && (
              <div className="relative h-40 w-full overflow-hidden rounded-xl bg-zinc-100 -mt-2 mb-2">
                <Image src={confirming.image_url} alt={confirming.name} fill className="object-cover" />
              </div>
            )}
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
                You have redeemed <span className="font-semibold text-zinc-800">{success.reward_name}</span>.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 px-4 py-4">
              <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider mb-1">Redemption Code</p>
              <p className="font-mono text-2xl font-bold tracking-widest text-emerald-700">{success.redemption_code}</p>
              <p className="mt-1.5 text-xs text-emerald-600">RM {success.discount_rm.toFixed(2)} off your next order</p>
            </div>
            <p className="text-sm text-zinc-500">Show this code to the cashier to apply your discount.</p>
            <Button className="w-full" onClick={() => setSuccess(null)}>Done</Button>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
