import {
  RULE_CATEGORY_LABELS,
  RULE_SCOPE_LABELS,
  RULE_STATUS_PILL_VARIANT,
  RULE_TYPE_LABELS,
} from "@/constants/rule-library";
import type { RuleCategoryId, RuleLifecycleStatus, RuleScope, RuleType } from "@/types/rule-library";
import { StatusPill } from "@/components/design-system/status-pill";
import { cn } from "@/lib/utils";

const categoryAccent: Record<RuleCategoryId, string> = {
  financial: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  property: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  bureau: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
  banking: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  customer: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  geography: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",
  custom: "bg-muted text-muted-foreground border-border/60",
};

export function RuleCategoryBadge({
  categoryId,
  className,
}: {
  categoryId: RuleCategoryId;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        categoryAccent[categoryId],
        className,
      )}
    >
      {RULE_CATEGORY_LABELS[categoryId]}
    </span>
  );
}

export function RuleStatusBadge({ status }: { status: RuleLifecycleStatus }) {
  return (
    <StatusPill variant={RULE_STATUS_PILL_VARIANT[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </StatusPill>
  );
}

export function RuleScopeBadge({ scope }: { scope: RuleScope }) {
  return (
    <StatusPill variant="info" dot={false}>
      {RULE_SCOPE_LABELS[scope]}
    </StatusPill>
  );
}

export function RuleTypeBadge({ ruleType }: { ruleType: RuleType }) {
  return (
    <StatusPill variant="default" dot={false}>
      {RULE_TYPE_LABELS[ruleType]}
    </StatusPill>
  );
}
