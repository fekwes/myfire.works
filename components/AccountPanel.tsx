"use client";

import { Check, Download, Share2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button, ButtonLink, Card } from "@/components/ui";
import { clearPlanLocal } from "@/lib/plan-storage";
import { PROFILES_TABLE } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/client";

const inputClasses =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <h2 className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h2>
      {description && (
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

/** What still works without an account — true in every signed-out state. */
function WithoutAnAccount() {
  return (
    <SectionCard
      title="Your plan is safe either way"
      description="An account is only for syncing across devices. Everything below works right now, signed in or not."
    >
      <ul className="space-y-2.5 text-sm text-muted-foreground">
        <li className="flex items-start gap-2.5">
          <Check className="mt-0.5 size-4 shrink-0 text-success" />
          Your plan is saved on this device and reloads automatically.
        </li>
        <li className="flex items-start gap-2.5">
          <Download className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          Export it as CSV or JSON, or print it to PDF, from the planner.
        </li>
        <li className="flex items-start gap-2.5">
          <Share2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          Share a read-only link — the figures travel in the URL, not a server.
        </li>
      </ul>
      <div className="mt-4">
        <ButtonLink href="/planner" variant="secondary">
          Go to your dashboard →
        </ButtonLink>
      </div>
    </SectionCard>
  );
}

export function AccountPanel({
  /** True when the link that brought them here had expired or been used. */
  linkExpired = false,
}: { linkExpired?: boolean } = {}) {
  const { user, configured, loading } = useAuth();

  return (
    <div className="space-y-5">
      {linkExpired && !user && (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          That link has expired or was already used, so you&apos;re not signed
          in. Sign in from the header, or request a new link — your account and
          your saved plans are untouched.
        </p>
      )}
      <Card padding="lg">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Account
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Manage your sign-in and your saved data. Your plan itself lives on this
          device and travels via the planner&apos;s{" "}
          <Link
            href="/planner"
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            export and share
          </Link>{" "}
          options.
        </p>
      </Card>

      {!configured ? (
        <>
          <SectionCard title="Accounts">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Accounts aren&apos;t enabled in this deployment, so there&apos;s
              nothing to sign in to.
            </p>
          </SectionCard>
          <WithoutAnAccount />
        </>
      ) : loading ? (
        <SectionCard title="Account">
          <p className="text-sm text-muted-foreground">Checking your sign-in…</p>
        </SectionCard>
      ) : !user ? (
        <>
          <SectionCard title="Account">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Sign in from the header to sync your saved profiles across devices
              and change your password.
            </p>
          </SectionCard>
          <WithoutAnAccount />
        </>
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
  // Success and failure are different things and must not look the same.
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Those two passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const { error: updateError } = await createClient().auth.updateUser({
        password,
      });
      if (updateError) throw updateError;
      setPassword("");
      setConfirm("");
      setDone("Password updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteData() {
    setDeleting(true);
    // Prefer full account deletion (service-role route). If that isn't enabled,
    // fall back to removing the user's own data rows with the anon key.
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        await createClient().from(PROFILES_TABLE).delete().eq("user_id", userId);
      }
    } catch {
      await createClient().from(PROFILES_TABLE).delete().eq("user_id", userId);
    }
    clearPlanLocal();
    await createClient().auth.signOut();
    window.location.href = "/";
  }

  return (
    <>
      <SectionCard title="Signed in as">
        <p className="text-sm font-medium text-foreground">{email}</p>
      </SectionCard>

      <SectionCard
        title="Change password"
        description="At least 6 characters. You'll stay signed in on this device."
      >
        <form onSubmit={changePassword} className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">
              New password
            </span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClasses}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">
              Confirm new password
            </span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClasses}
            />
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? "Updating…" : "Update password"}
          </Button>
          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs leading-relaxed text-danger"
            >
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              {error}
            </p>
          )}
          {done && !error && (
            <p
              role="status"
              className="flex items-center gap-2 text-xs font-medium text-success"
            >
              <Check className="size-3.5 shrink-0" />
              {done}
            </p>
          )}
        </form>
      </SectionCard>

      <SectionCard
        title="Danger zone"
        description="Permanently delete your account and everything saved to it, then sign out. This can't be undone."
      >
        {confirmDelete ? (
          <div className="rounded-xl border border-danger/40 bg-danger/5 p-4">
            <p className="flex items-start gap-2 text-sm font-medium text-foreground">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" />
              Delete your account, your saved profiles and the plan on this
              device?
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="danger"
                onClick={deleteData}
                disabled={deleting}
                className="border-danger bg-danger text-white hover:bg-danger hover:opacity-90"
              >
                {deleting ? "Deleting…" : "Yes, delete everything"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="danger"
            onClick={() => setConfirmDelete(true)}
          >
            Delete my account
          </Button>
        )}
      </SectionCard>
    </>
  );
}
