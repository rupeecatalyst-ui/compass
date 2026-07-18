"use client";

import { useEffect, useState } from "react";
import { CommandShellLoading } from "@/components/design-system/command-shell-loading";
import { HorizonHeader, HorizonInitiativeBoard } from "./components";
import { createHorizonWorkspaceProvider } from "./providers";
import type { HorizonWorkspaceModel, ModeId } from "./types";

/**
 * CO-SPRINT-091 — Horizon Workspace foundation.
 * Single-screen strategic planning · Initiative → Workstream → Milestone → Activity.
 * No AI advice, chat, notifications, analytics, Gantt, or automation.
 */
export function HorizonWorkspace() {
  const [model, setModel] = useState<HorizonWorkspaceModel | null>(null);
  const [mode, setMode] = useState<ModeId>("strategic");
  const [refreshing, setRefreshing] = useState(false);

  const reload = () => {
    setRefreshing(true);
    void createHorizonWorkspaceProvider()
      .getWorkspaceModel()
      .then((page) => {
        setModel(page);
        setMode(page.mode);
      })
      .finally(() => setRefreshing(false));
  };

  useEffect(() => {
    let cancelled = false;
    void createHorizonWorkspaceProvider()
      .getWorkspaceModel()
      .then((page) => {
        if (cancelled) return;
        setModel(page);
        setMode(page.mode);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!model) {
    return <CommandShellLoading label="Preparing Horizon…" />;
  }

  return (
    <div className="space-y-4 md:space-y-5" aria-label="Horizon Strategic Planning Workspace">
      <HorizonHeader
        mode={mode}
        modes={model.modes}
        onModeChange={setMode}
        onRefresh={reload}
        refreshing={refreshing}
      />

      <section className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-2 px-0.5">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Initiatives</h2>
            <p className="text-[11px] text-zinc-500">
              {mode === "strategic"
                ? "Strategic Mode · portfolio view with concise hierarchy"
                : "Operational Mode · activity detail when expanded"}
            </p>
          </div>
          <p className="text-[11px] tabular-nums text-zinc-500">
            {model.initiatives.length} initiative{model.initiatives.length === 1 ? "" : "s"}
          </p>
        </div>

        <HorizonInitiativeBoard
          initiatives={model.initiatives}
          mode={mode}
          asOf={model.portfolio.asOf}
        />
      </section>
    </div>
  );
}
