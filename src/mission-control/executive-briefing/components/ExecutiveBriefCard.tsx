"use client";

import type { ExecutiveBrief } from "../types";
import { cn } from "../../shared/cn";

/**
 * AI-ready brief card — accepts full ExecutiveBrief contract without redesign.
 */
export function ExecutiveBriefCard({ brief }: { brief: ExecutiveBrief }) {
  const paragraphs = brief.summary.split(/\n\n+/).filter(Boolean);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-5 md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            CHANAKYA · Executive Intelligence
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-50">{brief.title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-500">
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 font-semibold",
              brief.riskLevel === "critical" || brief.riskLevel === "high"
                ? "border-amber-500/40 text-amber-200"
                : "border-zinc-700 text-zinc-400",
            )}
          >
            Risk · {brief.riskLevel}
          </span>
          {typeof brief.confidence === "number" && (
            <span className="rounded-full border border-zinc-700 px-2 py-0.5">
              Confidence · {brief.confidence}%
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-4 border-l border-zinc-800 pl-4">
        {paragraphs.map((p) => (
          <p key={p.slice(0, 24)} className="text-[15px] leading-relaxed text-zinc-200">
            {p}
          </p>
        ))}
      </div>

      {brief.observations.length > 0 && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Observations
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-zinc-400">
              {brief.observations.map((o) => (
                <li key={o} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-600" />
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Recommendations
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-zinc-400">
              {brief.recommendations.map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-teal-500/70" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80 pt-4 text-[10px] uppercase tracking-wider text-zinc-600">
        <span>
          Sources · {brief.sourceModules.join(", ") || "—"}
        </span>
        <span className="tabular-nums">
          Generated · {new Date(brief.generatedAt).toLocaleString()}
        </span>
      </div>
    </section>
  );
}
