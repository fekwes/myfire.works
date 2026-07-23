"use client";

import { useMemo, useState } from "react";
import { DEFAULT_FIRE_FORM_VALUES, FireForm } from "@/components/FireForm";
import { simulateFire, type FireInputs } from "@/lib/fire-engine";

export function FireDashboard() {
  const [inputs, setInputs] = useState<FireInputs>(DEFAULT_FIRE_FORM_VALUES);
  const result = useMemo(() => simulateFire(inputs), [inputs]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <section className="rounded-2xl border border-border bg-surface p-6 lg:col-span-2">
        <h2 className="mb-5 text-sm font-medium text-muted-foreground">
          Your details
        </h2>
        <FireForm value={inputs} onChange={setInputs} />
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6 lg:col-span-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Projection
        </h2>
        <p className="mt-4 text-sm text-muted-foreground">
          {result.sustainableToLifeExpectancy
            ? "Your plan looks sustainable to age 95."
            : "Your current inputs may not sustain your target income — chart coming next."}
        </p>
      </section>
    </div>
  );
}
