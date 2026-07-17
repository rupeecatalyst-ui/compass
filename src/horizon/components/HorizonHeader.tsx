"use client";

import { useRouter } from "next/navigation";
import { Orbit } from "lucide-react";
import type { Mode, ModeId } from "../types";
import { ModeSwitcher } from "./ModeSwitcher";
import { WorkspacePrimaryActions } from "@/components/catalyst-one/shared/workspace-primary-actions";
import { ROUTES } from "@/constants/routes";

export function HorizonHeader({
  mode,
  modes,
  onModeChange,
  onRefresh,
  refreshing,
}: {
  mode: ModeId;
  modes: readonly Mode[];
  onModeChange: (mode: ModeId) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const router = useRouter();

  return (
    <header className="relative overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-950">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 10% 0%, rgba(34,211,238,0.12), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 20%, rgba(45,212,191,0.08), transparent 50%)",
        }}
      />
      <div className="relative flex flex-wrap items-start justify-between gap-4 p-5 md:p-6">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-200">
              <Orbit className="h-4 w-4" aria-hidden />
            </span>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-200/80">
              Horizon
            </p>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 md:text-3xl">
            Strategic Planning Workspace
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
            Plan, organize, monitor, and complete long-term strategic initiatives — expansion,
            hiring, products, technology, campaigns, and organizational improvements.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <WorkspacePrimaryActions
            mode="readonly"
            onClose={() => router.push(ROUTES.DASHBOARD)}
            onRefresh={onRefresh}
            refreshing={refreshing}
            className="[&_button]:border-zinc-700 [&_button]:text-zinc-200 [&_button:hover]:bg-zinc-800 [&_button:hover]:text-zinc-50"
          />
          <ModeSwitcher mode={mode} modes={modes} onChange={onModeChange} />
        </div>
      </div>
      <div className="relative h-px w-full bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
    </header>
  );
}
