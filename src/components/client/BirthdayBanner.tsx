"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function isBirthdayMonth(birthday: string | null) {
  if (!birthday) return false;
  return new Date(birthday).getUTCMonth() === new Date().getMonth();
}

export default function BirthdayBanner({ birthday }: { birthday: string | null }) {
  const [localBirthday, setLocalBirthday] = useState(birthday);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  const isMonth = isBirthdayMonth(localBirthday);

  async function save() {
    if (!input) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from("profiles").update({ birthday: input }).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error("Failed to save"); return; }
    setLocalBirthday(input);
    toast.success("Birthday saved! 🎂");
  }

  if (isMonth) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-pink-600 to-rose-500 p-5 text-white shadow-lg">
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">Birthday Gift 🎂</p>
        <p className="text-lg font-black">Happy Birthday!</p>
        <p className="text-sm text-white/80 mt-1">Show this to our cashier this month to claim your exclusive birthday gift!</p>
        <div className="mt-3 rounded-xl bg-white/20 px-4 py-2.5 text-center">
          <p className="text-sm font-bold">1× Free Dessert or Special Discount 🎁</p>
        </div>
      </div>
    );
  }

  if (localBirthday) {
    const monthName = new Date(localBirthday + "T00:00:00").toLocaleString("en-MY", { month: "long" });
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-pink-100 bg-pink-50 px-4 py-4">
        <span className="text-3xl shrink-0">🎂</span>
        <div>
          <p className="text-sm font-bold text-zinc-800">Birthday Gift</p>
          <p className="text-xs text-zinc-500 mt-0.5">Your birthday month is <span className="font-semibold text-pink-600">{monthName}</span>. We have a special gift waiting for you!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-pink-100 bg-pink-50 p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">🎂</span>
        <div>
          <p className="text-sm font-bold text-zinc-800">Exclusive Birthday Gift</p>
          <p className="text-xs text-zinc-500">Add your birthday to receive a free gift every year!</p>
        </div>
      </div>
      <div className="flex gap-2">
        <input type="date" value={input} onChange={e => setInput(e.target.value)}
          className="flex-1 rounded-xl border border-pink-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
        <Button size="sm" onClick={save} disabled={!input || saving}
          className="bg-pink-500 hover:bg-pink-600 text-white rounded-xl px-4 shrink-0">
          {saving ? "…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
