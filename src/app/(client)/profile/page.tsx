import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import BirthdayForm from "@/components/client/BirthdayForm";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, loyalty_points, birthday, birthday_set")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return (
    <div className="flex flex-col bg-zinc-50 min-h-screen pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-zinc-100 bg-white px-4 py-3">
        <Link href="/dashboard" className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <p className="text-sm font-bold text-zinc-900">My Profile</p>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Info rows */}
        <div className="rounded-2xl border border-zinc-200 bg-white divide-y divide-zinc-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5">
            <p className="text-sm text-zinc-500">Name</p>
            <p className="text-sm font-semibold text-zinc-900">{profile.full_name ?? "—"}</p>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <p className="text-sm text-zinc-500">Email</p>
            <p className="text-sm font-semibold text-zinc-900">{user.email}</p>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <p className="text-sm text-zinc-500">Points</p>
            <p className="text-sm font-semibold text-zinc-900">{(profile.loyalty_points ?? 0).toLocaleString()} pts</p>
          </div>
        </div>

        {/* Birthday setting */}
        <BirthdayForm
          currentBirthday={profile.birthday ?? null}
          birthdaySet={profile.birthday_set ?? false}
        />
      </div>
    </div>
  );
}
