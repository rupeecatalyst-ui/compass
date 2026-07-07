import { cn } from "@/lib/utils";
import type { InsightCardType } from "@/modules/intelligence/types";

const TYPE_STYLES: Record<
  InsightCardType,
  { border: string; label: string; dot: string }
> = {
  information: {
    border: "border-slate-600",
    label: "Information",
    dot: "bg-slate-400",
  },
  success: {
    border: "border-emerald-700",
    label: "Success",
    dot: "bg-emerald-500",
  },
  warning: {
    border: "border-amber-700",
    label: "Warning",
    dot: "bg-amber-500",
  },
  critical: {
    border: "border-red-700",
    label: "Critical",
    dot: "bg-red-500",
  },
  recommendation: {
    border: "border-blue-700",
    label: "Recommendation",
    dot: "bg-blue-500",
  },
};

export interface InsightCardProps {
  type: InsightCardType;
  title: string;
  description: string;
  businessImpact?: string;
  recommendedAction?: string;
  confidence?: number;
  owner?: string;
  className?: string;
}

/** 10.3B — Reusable intelligence insight card. */
export function InsightCard({
  type,
  title,
  description,
  businessImpact,
  recommendedAction,
  confidence,
  owner,
  className,
}: InsightCardProps) {
  const style = TYPE_STYLES[type];

  return (
    <article
      className={cn(
        "rounded-lg border bg-[#111827] px-5 py-4",
        style.border,
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", style.dot)} aria-hidden />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {style.label}
          </span>
        </div>
        {confidence != null && (
          <span className="text-[10px] tabular-nums text-slate-500">{confidence}% confidence</span>
        )}
      </div>

      <h4 className="text-sm font-semibold leading-snug text-slate-100">{title}</h4>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>

      {businessImpact && (
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          <span className="font-medium text-slate-400">Impact — </span>
          {businessImpact}
        </p>
      )}

      {recommendedAction && (
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          <span className="font-medium text-slate-400">Action — </span>
          {recommendedAction}
        </p>
      )}

      {owner && (
        <p className="mt-3 text-[10px] uppercase tracking-wider text-slate-600">Owner · {owner}</p>
      )}
    </article>
  );
}
