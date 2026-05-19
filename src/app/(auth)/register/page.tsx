"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

const RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Contains a letter", test: (p: string) => /[a-zA-Z]/.test(p) },
  { label: "Contains a number", test: (p: string) => /[0-9]/.test(p) },
  { label: "Contains a symbol (!@#$…)", test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
];

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const allRulesMet = RULES.every(r => r.test(password));
  const passwordsMatch = password === confirm;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!allRulesMet) {
      toast.error("Password does not meet the requirements.");
      return;
    }
    if (!passwordsMatch) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          ...(phone.trim() ? { phone: phone.trim() } : {}),
        },
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Account created! Redirecting…");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Create an account</h1>
          <p className="text-sm text-zinc-500">Join to start earning loyalty points</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" type="text" autoComplete="name" placeholder="Jane Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required disabled={loading} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone <span className="text-zinc-400 font-normal">(optional)</span></Label>
              <Input id="phone" type="tel" autoComplete="tel" placeholder="+60 12 345 6789" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setShowRules(true)}
                required
                disabled={loading}
              />
              {showRules && (
                <ul className="mt-2 space-y-1 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
                  {RULES.map(rule => {
                    const met = rule.test(password);
                    return (
                      <li key={rule.label} className={`flex items-center gap-2 text-xs ${met ? "text-emerald-600" : "text-zinc-400"}`}>
                        {met
                          ? <Check className="h-3 w-3 shrink-0" />
                          : <X className="h-3 w-3 shrink-0" />}
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                disabled={loading}
                className={confirm && !passwordsMatch ? "border-red-400 focus-visible:ring-red-400" : ""}
              />
              {confirm && !passwordsMatch && (
                <p className="text-xs text-red-500">Passwords do not match.</p>
              )}
              {confirm && passwordsMatch && (
                <p className="text-xs text-emerald-600 flex items-center gap-1"><Check className="h-3 w-3" /> Passwords match</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading || !allRulesMet || !passwordsMatch}>
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-zinc-900 underline-offset-4 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
