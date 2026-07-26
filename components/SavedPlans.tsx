"use client";

import { Check, Copy, FolderOpen, Pencil, Save, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui";
import type { FireInputs } from "@/lib/fire-engine";
import {
  describeProfileError,
  findProfileByName,
  formatSavedAt,
  isValidProfileName,
  MAX_PROFILE_NAME,
  nextCopyName,
  normaliseProfileName,
  parseProfileRows,
  type Profile,
  type ProfileAction,
  profileInputsForLoad,
  PROFILES_TABLE,
} from "@/lib/profiles";
import { createClient } from "@/lib/supabase/client";

const inputClasses =
  "min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

/**
 * Saved profiles — name a plan, keep several, load one back.
 *
 * Every write reports its result: a save that fails says so instead of
 * flashing a success tick, which is what previously made saves look like they
 * had landed when they hadn't. The profile you last saved or loaded is tracked
 * as "active", so Save updates it in place and "Save a copy" branches it.
 */
export function SavedPlans({
  inputs,
  onLoad,
}: {
  inputs: FireInputs;
  onLoad: (inputs: FireInputs) => void;
}) {
  const { user, configured } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  /**
   * Read every profile for the signed-in user, newest first.
   *
   * The `user_id` filter is belt-and-braces: RLS already restricts rows to
   * their owner, but a select that says which rows it wants doesn't depend on
   * the policy being right to stay correct. Every row is then run through
   * `parseProfileRows`, because a `jsonb` blob is untrusted input like any
   * other — see the note there.
   */
  const fetchProfiles = useCallback(async (userId: string) => {
    const supabase = createClient();
    const { data, error: readError } = await supabase
      .from(PROFILES_TABLE)
      .select("id, name, inputs, updated_at")
      .eq("user_id", userId);
    return { ...parseProfileRows(data), readError };
  }, []);

  /** Apply a read's outcome to state, reporting a failure rather than hiding it. */
  const applyRead = useCallback(
    (result: {
      profiles: Profile[];
      dropped: number;
      readError: { code?: string | null; message?: string | null } | null;
    }) => {
      setLoaded(true);
      if (result.readError) {
        setError(describeProfileError(result.readError, "read"));
        return;
      }
      setProfiles(result.profiles);
      setError(
        result.dropped === 0
          ? null
          : result.dropped === 1
            ? "One saved plan couldn't be read and was hidden."
            : `${result.dropped} saved plans couldn't be read and were hidden.`,
      );
    },
    [],
  );

  const refresh = useCallback(async () => {
    if (!user) return;
    applyRead(await fetchProfiles(user.id));
  }, [applyRead, fetchProfiles, user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const result = await fetchProfiles(user.id);
      if (active) applyRead(result);
    })();
    return () => {
      active = false;
    };
  }, [user, fetchProfiles, applyRead]);

  if (!configured) return null;

  if (!user) {
    return (
      <p className="rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground">
        Sign in (top right) to save this plan as a profile and load it back on
        any device.
      </p>
    );
  }

  const activeProfile = profiles.find((p) => p.id === activeId) ?? null;

  /** Flash a transient confirmation, and clear any stale error. */
  function succeed(message: string) {
    setError(null);
    setStatus(message);
    setTimeout(() => setStatus(null), 2500);
  }

  function fail(e: unknown, action: ProfileAction = "save") {
    setStatus(null);
    setError(
      describeProfileError(e as { code?: string; message?: string }, action) ??
        "Something went wrong.",
    );
  }

  /** Insert a brand-new profile under `newName`. */
  async function createProfile(newName: string) {
    setBusy(true);
    const supabase = createClient();
    const { data, error: writeError } = await supabase
      .from(PROFILES_TABLE)
      .insert({
        user_id: user!.id,
        name: newName,
        inputs,
        updated_at: new Date().toISOString(),
      })
      .select("id, name, inputs, updated_at")
      .single();
    setBusy(false);
    if (writeError) return fail(writeError);
    const inserted = data as { id?: unknown } | null;
    if (typeof inserted?.id !== "string") {
      // No error and no row: the insert didn't land. Say so — never flash a
      // success tick for a write we can't prove happened.
      return fail({ message: "the plan didn't come back from the server" });
    }
    setActiveId(inserted.id);
    setName("");
    await refresh();
    succeed(`Saved “${newName}”.`);
  }

  /** Overwrite an existing profile's inputs (keeping its name). */
  async function updateProfile(profile: Profile) {
    setBusy(true);
    const supabase = createClient();
    const { error: writeError } = await supabase
      .from(PROFILES_TABLE)
      .update({ inputs, updated_at: new Date().toISOString() })
      .eq("id", profile.id);
    setBusy(false);
    if (writeError) return fail(writeError);
    setActiveId(profile.id);
    await refresh();
    succeed(`Updated “${profile.name}”.`);
  }

  /**
   * Save: with a name typed, save under that name (overwriting the profile of
   * the same name if it exists); otherwise update whichever profile is active.
   */
  async function save() {
    const typed = normaliseProfileName(name);
    if (typed) {
      const existing = findProfileByName(profiles, typed);
      return existing ? updateProfile(existing) : createProfile(typed);
    }
    if (activeProfile) return updateProfile(activeProfile);
  }

  /** Save a copy under a guaranteed-free name, so nothing is overwritten. */
  async function saveCopy() {
    const base = normaliseProfileName(name) || activeProfile?.name || "Untitled plan";
    await createProfile(nextCopyName(base, profiles));
  }

  function load(profile: Profile) {
    const safe = profileInputsForLoad(profile);
    if (!safe) {
      return fail({
        message: `“${profile.name}” couldn't be read — it may have been saved by an older version.`,
      });
    }
    onLoad(safe);
    setActiveId(profile.id);
    succeed(`Loaded “${profile.name}”.`);
  }

  async function rename(profile: Profile) {
    const next = normaliseProfileName(renameValue);
    if (!next || next === profile.name) {
      setRenamingId(null);
      return;
    }
    const clash = findProfileByName(profiles, next);
    if (clash && clash.id !== profile.id) {
      setError("You already have a plan with that name.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error: writeError } = await supabase
      .from(PROFILES_TABLE)
      .update({ name: next, updated_at: new Date().toISOString() })
      .eq("id", profile.id);
    setBusy(false);
    setRenamingId(null);
    if (writeError) return fail(writeError);
    await refresh();
    succeed(`Renamed to “${next}”.`);
  }

  async function remove(profile: Profile) {
    setBusy(true);
    const supabase = createClient();
    const { error: writeError } = await supabase
      .from(PROFILES_TABLE)
      .delete()
      .eq("id", profile.id);
    setBusy(false);
    if (writeError) return fail(writeError, "delete");
    if (activeId === profile.id) setActiveId(null);
    await refresh();
    succeed(`Deleted “${profile.name}”.`);
  }

  const canSave = isValidProfileName(name) || Boolean(activeProfile);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={name}
          maxLength={MAX_PROFILE_NAME}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSave && !busy) {
              e.preventDefault();
              void save();
            }
          }}
          placeholder={
            activeProfile ? `Update “${activeProfile.name}”…` : "Name this plan…"
          }
          aria-label="Profile name"
          className={inputClasses}
        />
        <Button
          type="button"
          variant="brand"
          onClick={() => void save()}
          disabled={busy || !canSave}
        >
          {status?.startsWith("Saved") || status?.startsWith("Updated") ? (
            <Check className="size-3.5" />
          ) : (
            <Save className="size-3.5" />
          )}
          Save
        </Button>
        {(activeProfile || isValidProfileName(name)) && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => void saveCopy()}
            disabled={busy}
            title="Save these figures as a separate profile"
          >
            <Copy className="size-3.5" />
            Save a copy
          </Button>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger"
        >
          {error}
        </p>
      )}
      {status && !error && (
        <p role="status" className="text-xs text-muted-foreground">
          {status}
        </p>
      )}

      {loaded && profiles.length === 0 && !error && (
        <p className="rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground">
          No saved profiles yet. Name this plan above to keep it — you can save
          as many as you like and switch between them.
        </p>
      )}

      {profiles.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {profiles.map((profile) => {
            const isActive = profile.id === activeId;
            const savedAt = formatSavedAt(profile.updated_at);
            return (
              <li
                key={profile.id}
                className={`flex flex-wrap items-center gap-2 px-3 py-2.5 ${
                  isActive ? "bg-brand/5" : ""
                }`}
              >
                {renamingId === profile.id ? (
                  <>
                    {/* biome-ignore lint/a11y/noAutofocus: focus belongs in the field the user just opened */}
                    <input
                      autoFocus
                      type="text"
                      value={renameValue}
                      maxLength={MAX_PROFILE_NAME}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void rename(profile);
                        }
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      aria-label={`Rename ${profile.name}`}
                      className={inputClasses}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => void rename(profile)}
                      disabled={busy}
                    >
                      Save name
                    </Button>
                    <button
                      type="button"
                      onClick={() => setRenamingId(null)}
                      aria-label="Cancel rename"
                      className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex min-w-0 flex-1 items-baseline gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {profile.name}
                      </span>
                      {isActive && (
                        <span className="shrink-0 rounded-full border border-primary/40 bg-brand/10 px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-wider text-primary">
                          active
                        </span>
                      )}
                      {savedAt && (
                        <span className="shrink-0 text-[0.7rem] text-muted-foreground">
                          {savedAt}
                        </span>
                      )}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => load(profile)}
                      disabled={busy}
                    >
                      <FolderOpen className="size-3.5" />
                      Load
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingId(profile.id);
                        setRenameValue(profile.name);
                      }}
                      aria-label={`Rename ${profile.name}`}
                      className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(profile)}
                      disabled={busy}
                      aria-label={`Delete ${profile.name}`}
                      className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-danger disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
