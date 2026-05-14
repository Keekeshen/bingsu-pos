"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import RedeemClient from "@/components/client/RedeemClient";

type Reward = { id: string; name: string; description: string | null; points_cost: number; discount_rm: number };

export default function RedeemPage() {
  const [points, setPoints] = useState(0);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = "/login"; return; }
      const [{ data: prof }, { data: rewardList }] = await Promise.all([
        supabase.from("profiles").select("loyalty_points").eq("id", session.user.id).single(),
        supabase.from("rewards").select("*").eq("is_active", true).order("points_cost"),
      ]);
      setPoints(prof?.loyalty_points ?? 0);
      setRewards(rewardList ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" /></div>;
  return <RedeemClient initialPoints={points} rewards={rewards} />;
}