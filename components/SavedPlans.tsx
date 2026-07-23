"use client";

import { Check, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import type { FireInputs } from "@/lib/fire-engine";

interface SavedPlan {
  id: string;
  name: string;
  inputs: FireInputs;
}

export function SavedPlans({
  inputs,
  onLoad,
}: {
  inputs: FireInputs;
  onLoad: (inputs: FireInputs) => void;
}) {
  const { user, configured } = useAuth();
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("portfolios")
        .select("id, name, inputs")
        .order("updated_at", { ascending: false });
      if (active) setPlans((data as SavedPlan[]) ?? []);
    })();
    return () => {
      active = false;
    };
  }, [user, tick]);

  if (!configured) return null;

  if (!user) {
    return (
      <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
        Sign in (top right) to save your plans and reload them later.
      </p>
    );
  }

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.from("portfolios").upsert(
      {
        user_id: user!.id,
        name: name.trim(),
        inputs,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,name" },
    );
    setName("");
    setBusy(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
    setTick((t) => t + 1);
  }

  async function remove(id: string) {
    const supabase = createClient();
    await supabase.from("portfolios").delete().eq("id", id);
    setTick((t) => t + 1);
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name this plan…"
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="button"
          onClick={save}
          disabled={busy || !name.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {justSaved ? (
            <Check className="size-3.5" />
          ) : (
            <Save className="size-3.5" />
          )}
          Save
        </button>
      </div>

      {plans.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {plans.map((plan) => (
            <li
              key={plan.id}
              className="flex items-center gap-1 rounded-full border border-border bg-surface-muted py-1 pl-3 pr-1 text-xs"
            >
              <button
                type="button"
                onClick={() => onLoad(plan.inputs)}
                className="font-medium text-foreground hover:text-primary"
              >
                {plan.name}
              </button>
              <button
                type="button"
                onClick={() => remove(plan.id)}
                aria-label={`Delete ${plan.name}`}
                className="rounded-full p-1 text-muted-foreground hover:text-danger"
              >
                <Trash2 className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
