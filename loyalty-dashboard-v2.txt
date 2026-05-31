import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import LoyaltyCard from "@/components/client/LoyaltyCard";
import QRDisplay from "@/components/client/QRDisplay";
import BirthdayBanner from "@/components/client/BirthdayBanner";
import { Gift, Receipt, Star } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: orderStats }, { data: rewards }] = await Promise.all([
    supabase.from("profiles").select("full_name, loyalty_points, birthday").eq("id", user.id).single(),
    supabase.from("orders").select("id").eq("customer_id", user.id).eq("status", "completed"),
    supabase.from("rewards").select("id").eq("is_active", true),
  ]);

  if (!profile) redirect("/login");

  const loyaltyPoints = profile.loyalty_points ?? 0;
  const totalOrders = orderStats?.length ?? 0;
  const availableRewards = rewards?.length ?? 0;

  return (
    <div className="flex flex-col bg-zinc-50 min-h-screen">
      {/* Profile header */}
      <div className="bg-white px-4 pt-5 pb-4 border-b border-zinc-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-white text-lg font-bold">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-base font-bold text-zinc-900">{profile.full_name}</p>
              <p className="text-xs text-zinc-400">Koori Dessert Member</p>
            </div>
          </div>
          <Link href="/dashboard" className="rounded-lg border border-zinc-200 p-2 hover:bg-zinc-50">
            <div className="grid grid-cols-2 gap-0.5">
              {[...Array(4)].map((_, i) => <div key={i} className="h-1.5 w-1.5 rounded-sm bg-zinc-400" />)}
            </div>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-5 px-4 py-5">
        {/* Membership card */}
        <LoyaltyCard fullName={profile.full_name} loyaltyPoints={loyaltyPoints} userId={user.id} />

        {/* MY ACCOUNT */}
        <div>
          <p className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-400">My Account</p>
          <div className="grid grid-cols-3 gap-3">
            <AccountStat label="Points" value={loyaltyPoints.toLocaleString()} icon={<Star className="h-5 w-5 text-amber-500" />} href="/history" />
            <AccountStat label="Vouchers" value={availableRewards.toLocaleString()} icon={<Gift className="h-5 w-5 text-violet-500" />} href="/redeem" />
            <AccountStat label="Orders" value={totalOrders.toLocaleString()} icon={<Receipt className="h-5 w-5 text-blue-500" />} href="/history" />
          </div>
        </div>

        {/* QR code */}
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Member QR Code</p>
          <QRDisplay userId={user.id} fullName={profile.full_name} />
          <p className="text-center text-xs text-zinc-400">Show to cashier to earn or redeem points</p>
        </div>

        {/* Birthday banner */}
        <BirthdayBanner birthday={profile.birthday ?? null} />
      </div>
    </div>
  );
}

function AccountStat({ label, value, icon, href }: { label: string; value: string; icon: React.ReactNode; href: string }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-2 rounded-2xl border border-zinc-200 bg-white py-4 shadow-sm hover:bg-zinc-50 transition-colors">
      {icon}
      <p className="text-xl font-black tabular-nums text-zinc-900">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
    </Link>
  );
}
