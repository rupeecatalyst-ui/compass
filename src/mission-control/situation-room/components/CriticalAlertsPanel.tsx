"use client";

import type { CriticalAlert } from "../types";
import { AlertCard } from "./AlertCard";

export function CriticalAlertsPanel({
  alerts,
  embedded = false,
}: {
  alerts: CriticalAlert[];
  embedded?: boolean;
}) {
  return (
    <section className="space-y-3" aria-labelledby={embedded ? undefined : "sr-alerts-heading"}>
      {!embedded && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Critical Alerts
          </p>
          <h2 id="sr-alerts-heading" className="mt-1 text-lg font-semibold text-zinc-50">
            Immediate attention
          </h2>
        </div>
      )}
      <div className="space-y-3">
        {alerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
      </div>
    </section>
  );
}
