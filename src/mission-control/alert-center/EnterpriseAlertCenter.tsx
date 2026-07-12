"use client";

import { useEffect, useMemo, useState } from "react";
import { WorkspaceLoadingState } from "../shared/ui";
import { MC_HERO, MC_PAGE_EYEBROW } from "../shared/ui/patterns";
import { AlertCenterWidgetLayout } from "./AlertCenterWidgetLayout";
import { createAlertCenterProvider } from "./providers";
import type { AlertCenterModel, AlertFilter, EnterpriseAlert } from "./types";

/**
 * Enterprise Alert Center — Defender-style centralized alert surface.
 * Providers only; no channel delivery, KPI engine, or workflows.
 */
export function EnterpriseAlertCenter() {
  const [model, setModel] = useState<AlertCenterModel | null>(null);
  const [filter, setFilter] = useState<AlertFilter | null>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    void createAlertCenterProvider()
      .getAlertCenterModel(filter ?? undefined)
      .then((page) => {
        if (cancelled) return;
        setModel(page);
        setFilter((prev) => prev ?? page.filter);
        setSelectedId((prev) => {
          if (prev && page.alerts.some((a) => a.id === prev)) return prev;
          return page.alerts[0]?.id;
        });
      });
    return () => {
      cancelled = true;
    };
  }, [filter]);

  const selected: EnterpriseAlert | null = useMemo(() => {
    if (!model || !selectedId) return null;
    return model.alerts.find((a) => a.id === selectedId) ?? null;
  }, [model, selectedId]);

  if (!model || !filter) {
    return <WorkspaceLoadingState label="Preparing Enterprise Alert Center…" />;
  }

  return (
    <div className="space-y-5 md:space-y-6" aria-label="Enterprise Alert Center">
      <header className={MC_HERO}>
        <p className={`${MC_PAGE_EYEBROW} text-zinc-500`}>
          Mission Control · Security posture
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50 md:text-3xl">
          Enterprise Alert Center
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">
          Enterprise-wide destination for Catalyst One alerts. Engines publish through the Alert
          Framework; this surface consumes placeholder providers only — no email, SMS, WhatsApp, or
          push delivery.
        </p>
      </header>

      <AlertCenterWidgetLayout
        model={model}
        filter={filter}
        selected={selected}
        selectedId={selectedId}
        onFilterChange={setFilter}
        onSelect={(alert) => setSelectedId(alert.id)}
      />
    </div>
  );
}
