"use client";

import { ChanakyaAvatar, ChanakyaIdentityLabel } from "@/components/catalyst-one/chanakya-enterprise-identity";
import { OwGlassPanel } from "./workspace-design";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";
import {
  getOwChanakyaTabGuidance,
  type OwStrategicTabId,
} from "./strategic-tabs";

/**
 * Prompt 017 — Permanent CHANAKYA guidance for the active strategic tab (UI only).
 */
export function WorkspaceChanakyaTabGuide({ tab }: { tab: OwStrategicTabId }) {
  const { chanakyaAdvisory, intelligence } = useOpportunityWorkspace();
  const guide = getOwChanakyaTabGuidance(tab);
  const liveMessage = chanakyaAdvisory?.message;
  const reactions = chanakyaAdvisory?.reactions ?? [];
  const healthInsight = intelligence?.insights?.[0]?.message;

  return (
    <aside className="flex flex-col">
      <OwGlassPanel className="flex flex-col !p-0">
        <div className="flex items-center gap-2.5 border-b border-white/10 px-3 py-2">
          <ChanakyaAvatar size="sm" />
          <div className="min-w-0">
            <ChanakyaIdentityLabel surface="advisory" />
            <p className="truncate text-xs font-semibold text-zinc-100">Strategic Guidance</p>
          </div>
        </div>

        <div className="space-y-3 px-3 py-3 text-xs">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-300/80">
              This tab
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-50">{guide.headline}</p>
            <p className="mt-1.5 leading-relaxed text-zinc-300/90">“{guide.message}”</p>
          </div>

          {guide.nudges.length > 0 && (
            <ul className="space-y-1.5">
              {guide.nudges.map((n) => (
                <li
                  key={n}
                  className="rounded-lg border border-white/10 bg-zinc-950/50 px-2.5 py-1.5 text-zinc-300"
                >
                  {n}
                </li>
              ))}
            </ul>
          )}

          {(liveMessage || healthInsight) && (
            <div className="rounded-lg border border-violet-500/25 bg-violet-500/10 px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-200">
                Live advisory
              </p>
              <p className="mt-1 leading-relaxed text-violet-50/90">
                {liveMessage ?? healthInsight}
              </p>
            </div>
          )}

          {reactions.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Recent reactions
              </p>
              <ul className="mt-1.5 space-y-1 text-zinc-300">
                {reactions.slice(0, 4).map((r) => (
                  <li key={r}>· {r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </OwGlassPanel>
    </aside>
  );
}
