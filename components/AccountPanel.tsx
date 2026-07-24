"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { clearPlanLocal } from "@/lib/plan-storage";

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function AccountPanel() {
  const { user, configured, loading } = useAuth();

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-7">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Account
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Manage your sign-in and your saved data. Your plan itself lives on this
          device and travels via the Planner&apos;s export and share options.
        </p>
      </div>

      {!configured ? (
        <Card title="Accounts">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Accounts aren&apos;t enabled in this deployment. Your plan is still
            saved on this device, and you can export or share it from the
            Planner.
          </p>
        </Card>
      ) : loading ? (
        <Card title="Account">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </Card>
      ) : !user ? (
        <Card title="Account">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Sign in (top right) to change your password or manage your saved
            plans.
          </p>
        </Card>
      ) : (
        <SignedIn email={user.email ?? ""} userId={user.id} />
      )}
    </div>
  );
}

function SignedIn({ email, userId }: { email: string; userId: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setMessage("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirm("");
      setMessage("Password updated.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteData() {
    setDeleting(true);
    const supabase = createClient();
    // Remove the user's saved plans (RLS allows deleting your own rows), clear
    // the local plan, then sign out. Deleting the auth account itself needs a
    // service-role server route — see docs/HANDOFF.md — so this removes all
    // your data and signs you out.
    await supabase.from("portfolios").delete().eq("user_id", userId);
    clearPlanLocal();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <>
      <Card title="Signed in as">
        <p className="text-sm font-medium text-foreground">{email}</p>
      </Card>

      <Card title="Change password">
        <form onSubmit={changePassword} className="space-y-2.5">
          <input
            type="password"
            required
            minLength={6}
            placeholder="New password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Updating…" : "Update password"}
          </button>
          {message && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {message}
            </p>
          )}
        </form>
      </Card>

      <Card title="Danger zone">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Delete your saved plans from your account and sign out. This can&apos;t
          be undone.
        </p>
        {confirmDelete ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={deleteData}
              disabled={deleting}
              className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Yes, delete my data & sign out"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="mt-3 rounded-lg border border-danger/50 px-4 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/10"
          >
            Delete my data
          </button>
        )}
      </Card>
    </>
  );
}
