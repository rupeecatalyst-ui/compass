import { cn } from "@/lib/utils";
import type { Recommendation } from "@/modules/intelligence/types";

export interface RecommendationCardProps extends Recommendation {
  className?: string;
}

/** 10.3B — Reusable recommendation card. */
export function RecommendationCard({
  title,
  reason,
  expectedOutcome,
  estimatedTimeSaved,
  businessValue,
  confidence,
  owner,
  className,
}: RecommendationCardProps) {
  return (
    <article
      className={cn(
        "rounded-lg border border-slate-700 bg-[#111827] px-5 py-4",
        className,
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold leading-snug text-slate-100">{title}</h4>
        <span className="shrink-0 text-[10px] tabular-nums text-slate-500">{confidence}%</span>
      </div>

      <dl className="mt-4 space-y-3 text-xs">
        <div>
          <dt className="font-medium uppercase tracking-wider text-slate-500">Reason</dt>
          <dd className="mt-1 leading-relaxed text-slate-400">{reason}</dd>
        </div>
        <div>
          <dt className="font-medium uppercase tracking-wider text-slate-500">Expected Outcome</dt>
          <dd className="mt-1 leading-relaxed text-slate-400">{expectedOutcome}</dd>
        </div>
        {estimatedTimeSaved && (
          <div>
            <dt className="font-medium uppercase tracking-wider text-slate-500">Time Saved</dt>
            <dd className="mt-1 text-slate-400">{estimatedTimeSaved}</dd>
          </div>
        )}
        {businessValue && (
          <div>
            <dt className="font-medium uppercase tracking-wider text-slate-500">Business Value</dt>
            <dd className="mt-1 font-medium text-slate-300">{businessValue}</dd>
          </div>
        )}
      </dl>

      {owner && (
        <p className="mt-4 border-t border-slate-800 pt-3 text-[10px] uppercase tracking-wider text-slate-600">
          Owner · {owner}
        </p>
      )}
    </article>
  );
}
