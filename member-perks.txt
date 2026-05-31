"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Gift, Star, Calendar, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Reward = { id: string; name: string; description: string | null; points_cost: number; discount_rm: number | null };

type Props = {
  birthday: string | null;      // "YYYY-MM-DD" or null
  loyaltyPoints: number;
  rewards: Reward[];
};

function daysUntilMemberDay() {
  const now = new Date();
  const day = now.getDate();
  const next15 = new Date(now.getFullYear(), now.getMonth(), 15);
  if (day > 15) next15.setMonth(next15.getMonth() + 1);
  const diff = Math.round((next15.getTime() - now.getTime()) / 86400000);
  return { days: diff, isToday: day === 15, date: next15 };
}

function isBirthdayMonth(birthday: string | null) {
  if (!birthday) return false;
  const bMonth = new Date(birthday).getUTCMonth();
  return bMonth === new Date().getMonth();
}

function getBirthdayMonthName(birthday: string) {
  return new Date(birthday + "T00:00:00").toLocaleString("en-MY", { month: "long" });
}

export default function MemberPerks({ birthday, loyaltyPoints, rewards }: Props) {
  const [birthdayInput, setBirthdayInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [localBirthday, setLocalBirthday] = useState(birthday);

  const memberDay = daysUntilMemberDay();
  const isBday = isBirthdayMonth(localBirthday);
  const canAfford = (r: Reward) => loyaltyPoints >= r.points_cost;
  const affordableRewards = rewards.filter(canAfford);
  const upcomingRewards = rewards.filter(r => !canAfford(r)).slice(0, 2);

  async function saveBirthday() {
    if (!birthdayInput) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ birthday: birthdayInput }).eq("id", (await supabase.auth.getUser()).data.user!.id);
    setSaving(false);
    if (error) { toast.error("Failed to save birthday"); return; }
    setLocalBirthday(birthdayInput);
    toast.success("Birthday saved! 🎂");
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Birthday card */}
      {isBday ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 p-5 text-white shadow-lg">
          <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="flex items-start gap-3">
            <span className="text-3xl">🎂</span>
            <div className="flex-1">
              <p className="font-bold text-lg leading-tight">Happy Birthday!</p>
              <p className="text-sm text-white/80 mt-0.5">It&apos;s your birthday month! Show this to our cashier to claim your birthday gift. 🎁</p>
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-white/20 px-4 py-2 text-center">
            <p className="text-xs text-white/70">Birthday Gift</p>
            <p className="font-bold text-white">1× Free Item or Special Discount</p>
          </div>
        </div>
      ) : localBirthday ? (
        <div className="flex items-center gap-4 rounded-2xl border border-pink-100 bg-pink-50 px-4 py-4">
          <span className="text-2xl shrink-0">🎂</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-800">Birthday Gift</p>
            <p className="text-xs text-zinc-500 mt-0.5">Your birthday month is <span className="font-medium text-pink-600">{getBirthdayMonthName(localBirthday)}</span>. We&apos;ll have a special gift waiting!</p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-pink-100 bg-pink-50 p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🎂</span>
            <div>
              <p className="text-sm font-bold text-zinc-800">Birthday Gift</p>
              <p className="text-xs text-zinc-500">Add your birthday to receive a free gift every year!</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={birthdayInput}
              onChange={e => setBirthdayInput(e.target.value)}
              className="flex-1 rounded-xl border border-pink-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
            <Button size="sm" onClick={saveBirthday} disabled={!birthdayInput || saving} className="bg-pink-500 hover:bg-pink-600 text-white rounded-xl px-4">
              {saving ? "…" : "Save"}
            </Button>
          </div>
        </div>
      )}

      {/* Member Day card */}
      <div className={`relative overflow-hidden rounded-2xl p-4 ${memberDay.isToday ? "bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-lg" : "border border-violet-100 bg-violet-50"}`}>
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${memberDay.isToday ? "bg-white/20" : "bg-violet-100"}`}>
            <Star className={`h-6 w-6 ${memberDay.isToday ? "text-white" : "text-violet-500"}`} />
          </div>
          <div className="flex-1">
            <p className={`text-sm font-bold ${memberDay.isToday ? "text-white" : "text-zinc-800"}`}>
              {memberDay.isToday ? "🎉 Today is Member Day!" : "Member Day — Every 15th"}
            </p>
            <p className={`text-xs mt-0.5 ${memberDay.isToday ? "text-white/75" : "text-zinc-500"}`}>
              {memberDay.isToday
                ? "Earn double points on all purchases today!"
                : memberDay.days === 0 ? "Tomorrow is Member Day! Double points await."
                : `Double points in ${memberDay.days} day${memberDay.days !== 1 ? "s" : ""} — ${memberDay.date.toLocaleDateString("en-MY", { day: "numeric", month: "short" })}`}
            </p>
          </div>
        </div>
        {memberDay.isToday && (
          <div className="mt-3 rounded-xl bg-white/20 py-2 text-center">
            <p className="text-sm font-bold text-white">2× Points Active Now</p>
          </div>
        )}
      </div>

      {/* Available Rewards */}
      {affordableRewards.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Redeem Now</p>
          <div className="space-y-2">
            {affordableRewards.map(r => (
              <a key={r.id} href="/redeem" className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 hover:bg-emerald-100 transition-colors">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                  <Gift className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-800 truncate">{r.name}</p>
                  <p className="text-xs text-zinc-500">{r.points_cost.toLocaleString()} pts {r.discount_rm ? `· RM ${r.discount_rm} off` : ""}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-emerald-500 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Rewards */}
      {upcomingRewards.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Earn More to Unlock</p>
          <div className="space-y-2">
            {upcomingRewards.map(r => {
              const ptsNeeded = r.points_cost - loyaltyPoints;
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-white px-4 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100">
                    <Gift className="h-5 w-5 text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-500 truncate">{r.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                        <div className="h-full rounded-full bg-zinc-400" style={{ width: `${Math.min(loyaltyPoints / r.points_cost * 100, 100)}%` }} />
                      </div>
                      <span className="text-[10px] text-zinc-400 tabular-nums shrink-0">{ptsNeeded.toLocaleString()} more pts</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
