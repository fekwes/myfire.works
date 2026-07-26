"use client";

import { ChevronDown, LogOut, Settings, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { usePlan } from "@/components/PlanProvider";
import { Button, Menu } from "@/components/ui";
import { PROFILES_TABLE } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/client";

const authInputClasses =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

export function AuthButton() {
  const { user, loading, configured } = useAuth();
  const { inputs } = usePlan();
  const router = useRouter();
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Dismiss the popover on outside-click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
        // Land them in the app (their saved plan loads via PlanProvider).
        router.push("/planner");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${location.origin}/auth/callback` },
        });
        if (error) throw error;
        if (data.session) {
          // Confirmation off: they're signed in now. Persist the plan they just
          // built as their first profile so "sign up" actually saves it, then
          // land them in the app.
          try {
            await supabase.from(PROFILES_TABLE).insert({
              user_id: data.session.user.id,
              name: "My plan",
              inputs,
              updated_at: new Date().toISOString(),
            });
          } catch {
            // Non-fatal — the plan is still safe locally.
          }
          setOpen(false);
          router.push("/planner");
        } else {
          setMessage(
            "Check your email to confirm your account, then sign in — your plan is saved on this device meanwhile.",
          );
        }
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function forgotPassword() {
    if (!email) {
      setMessage("Enter your email above first, then tap “Forgot password”.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/account`,
      });
      if (error) throw error;
      setMessage("Password reset link sent — check your email.");
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
    <div className="relative" ref={containerRef}>
      <Button
        type="button"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={panelId}
      >
        <UserIcon aria-hidden className="size-3.5" />
        Sign in
      </Button>

      {open && (
        <div
          id={panelId}
          className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border border-border bg-surface p-4 shadow-xl"
        >
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
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-foreground">
                Email
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={authInputClasses}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-foreground">
                Password
              </span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={authInputClasses}
              />
            </label>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          {mode === "signin" && (
            <button
              type="button"
              onClick={forgotPassword}
              disabled={busy}
              className="mt-2 text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline disabled:opacity-50"
            >
              Forgot password?
            </button>
          )}

          {message && (
            <p
              role="alert"
              className="mt-2 text-xs leading-relaxed text-muted-foreground"
            >
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
          onSelect: async () => {
            await createClient().auth.signOut();
            // Full reload home so no signed-in UI lingers.
            window.location.href = "/";
          },
        },
      ]}
    />
  );
}
