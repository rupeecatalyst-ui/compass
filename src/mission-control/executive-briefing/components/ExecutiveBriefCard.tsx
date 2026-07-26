"use client";

import type { ExecutiveBrief } from "../types";
import { cn } from "../../shared/cn";

/**
 * CO-SPRINT-094 — CHANAKYA Executive Briefing hero with summary pillars.
 */
export function ExecutiveBriefCard({ brief }: { brief: ExecutiveBrief }) {
  const paragraphs = brief.summary.split(/\n\n+/).filter(Boolean);
  const pillars = brief.summaryPillars ?? [];

  return (
    <section className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/95 to-zinc-950 p-5 md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            CHANAKYA · Executive Briefing
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-50 md:text-2xl">
            {brief.title}
          </h2>
        </div>
        <span
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            brief.riskLevel === "critical" || brief.riskLevel === "high"
              ? "border-amber-500/35 text-amber-200/90"
              : "border-zinc-700 text-zinc-400",
          )}
        >
          Risk · {brief.riskLevel}
        </span>
      </div>

      <div className="mt-5 space-y-3 border-l border-zinc-800 pl-4">
        {paragraphs.map((p) => (
          <p key={p.slice(0, 28)} className="text-[15px] leading-relaxed text-zinc-300">
            {p}
          </p>
        ))}
      </div>

      {pillars.length > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {pillars.map((pillar) => (
            <div
              key={pillar.id}
              className="rounded-xl border border-zinc-800/90 bg-zinc-950/60 px-3 py-3"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {pillar.label}
              </p>
              <ul className="mt-2 space-y-1.5">
                {pillar.points.map((point) => (
                  <li key={point} className="flex gap-2 text-[12px] leading-snug text-zinc-300">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-500" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80 pt-3 text-[10px] uppercase tracking-wider text-zinc-600">
        <span>Presented by · {brief.presentedBy}</span>
        <span className="tabular-nums">
          Generated · {new Date(brief.generatedAt).toLocaleString()}
        </span>
      </div>
    </section>
  );
}
