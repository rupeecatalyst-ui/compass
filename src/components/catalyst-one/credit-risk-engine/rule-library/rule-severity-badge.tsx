import {
  RULE_SEVERITY_BADGE_CLASS,
  RULE_SEVERITY_LABELS,
} from "@/constants/rule-severity";
import type { RuleSeverity } from "@/types/rule-library";
import { cn } from "@/lib/utils";

export function RuleSeverityBadge({
  severity,
  className,
  showLabel = true,
}: {
  severity: RuleSeverity;
  className?: string;
  /** When false, shows short label for compact dependency lists e.g. "(Critical)". */
  showLabel?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        RULE_SEVERITY_BADGE_CLASS[severity],
        className,
      )}
    >
      {showLabel ? RULE_SEVERITY_LABELS[severity] : RULE_SEVERITY_LABELS[severity]}
    </span>
  );
}

/** Compact inline label for dependency lists */
export function RuleSeverityInline({ severity }: { severity: RuleSeverity }) {
  return <RuleSeverityBadge severity={severity} className="ml-1" />;
}
