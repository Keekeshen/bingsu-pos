"use client";

import { useState } from "react";
import { Cake, Lock } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type Props = {
  currentBirthday: string | null;
  birthdaySet: boolean;
};

export default function BirthdayForm({ currentBirthday, birthdaySet }: Props) {
  const [value, setValue] = useState(currentBirthday ?? "");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(birthdaySet);
  const [displayDate, setDisplayDate] = useState(currentBirthday);

  function handleSetClick() {
    if (!value) { toast.error("Please pick a date first"); return; }
    setConfirming(true);
  }

  async function handleConfirm() {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Not signed in"); setSaving(false); return; }

    const { error } = await supabase
      .from("profiles")
      .update({ birthday: value, birthday_set: true })
      .eq("id", user.id);

    setSaving(false);
    setConfirming(false);

    if (error) { toast.error("Failed to save birthday"); return; }

    toast.success("Birthday saved!");
    setSaved(true);
    setDisplayDate(value);
  }

  const formatted = displayDate
    ? new Date(displayDate + "T00:00:00").toLocaleDateString("en-MY", { day: "numeric", month: "long" })
    : null;

  return (
    <>
      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 space-y-3">
        <div className="flex items-center gap-2">
          <Cake className="h-4 w-4 text-pink-500" />
          <p className="text-sm font-bold text-zinc-900">Birthday</p>
          {saved && (
            <span className="ml-auto rounded-full bg-pink-100 px-2.5 py-0.5 text-[10px] font-bold text-pink-600 flex items-center gap-1">
              <Lock className="h-3 w-3" /> Locked
            </span>
          )}
        </div>

        {saved ? (
          <div className="space-y-2">
            <p className="text-sm text-zinc-500">
              Your birthday is set to{" "}
              <span className="font-semibold text-zinc-900">{formatted}</span>.
            </p>
            <p className="text-xs text-zinc-400">
              Birthday can only be set once. A Free Drink voucher will be issued automatically on your birthday each year.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500">
              Set your birthday to receive a Free Drink voucher every year on your special day. This can only be set <strong>once</strong>.
            </p>
            <input
              type="date"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
            />
            <Button className="w-full" onClick={handleSetClick} disabled={!value}>
              Set My Birthday
            </Button>
          </div>
        )}
      </div>

      <Dialog open={confirming} onOpenChange={(o) => !saving && setConfirming(o)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Your Birthday</DialogTitle>
            <DialogDescription>
              You are setting your birthday to{" "}
              <span className="font-semibold text-zinc-900">
                {value ? new Date(value + "T00:00:00").toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" }) : ""}
              </span>
              .<br /><br />
              This <strong>cannot be changed</strong> after confirmation. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={saving}>
              Go Back
            </Button>
            <Button onClick={handleConfirm} disabled={saving}>
              {saving ? "Saving…" : "Yes, Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
