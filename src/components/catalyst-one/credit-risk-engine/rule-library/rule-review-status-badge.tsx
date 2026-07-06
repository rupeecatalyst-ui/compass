import {
  RULE_REVIEW_STATUS_BADGE_CLASS,
  RULE_REVIEW_STATUS_LABELS,
} from "@/constants/rule-governance";
import type { RuleReviewStatus } from "@/types/rule-library";
import { cn } from "@/lib/utils";

export function RuleReviewStatusBadge({
  status,
  className,
}: {
  status: RuleReviewStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        RULE_REVIEW_STATUS_BADGE_CLASS[status],
        className,
      )}
    >
      {RULE_REVIEW_STATUS_LABELS[status]}
    </span>
  );
}
