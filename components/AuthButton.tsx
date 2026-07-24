"use client";

import { ChevronDown, LogOut, Settings, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Menu } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export function AuthButton() {
  const { user, loading, configured } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!configured || loading) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setOpen(false);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${location.origin}/auth/callback` },
        });
        if (error) throw error;
        if (data.session) setOpen(false);
        else setMessage("Check your email to confirm your account.");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return <AccountMenu email={user.email ?? "Signed in"} />;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-semibold text-background transition-opacity hover:opacity-90"
      >
        <UserIcon className="size-3.5" />
        Sign in
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border border-border bg-surface p-4 shadow-xl">
          <div className="flex items-center gap-1 rounded-full border border-border bg-surface-muted p-1 text-xs">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setMessage(null);
                }}
                className={`flex-1 rounded-full px-2 py-1 font-semibold transition-colors ${
                  mode === m
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-3 space-y-2.5">
            <input
              type="email"
              required
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Password (min 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-foreground px-3 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy
                ? "…"
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          {message && (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function AccountMenu({ email }: { email: string }) {
  return (
    <Menu
      menuLabel="Account menu"
      triggerClassName="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      trigger={
        <>
          <UserIcon className="size-3.5" />
          <span className="hidden max-w-[10rem] truncate sm:inline">
            {email}
          </span>
          <ChevronDown className="size-3.5" />
        </>
      }
      items={[
        {
          label: "Account",
          href: "/account",
          icon: <Settings className="size-3.5" />,
        },
        {
          label: "Sign out",
          icon: <LogOut className="size-3.5" />,
          onSelect: () => createClient().auth.signOut(),
        },
      ]}
    />
  );
}
