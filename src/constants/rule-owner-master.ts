import {
  DEFAULT_RULE_OWNER_MASTER,
  type RuleOwnerMasterEntry,
} from "@/data/catalyst-one/credit-risk-engine/rule-owner-master-seed";
import type { RuleOwnerId } from "@/types/rule-library";

export type { RuleOwnerMasterEntry };
export { DEFAULT_RULE_OWNER_MASTER };

let ruleOwnerMasterOverride: RuleOwnerMasterEntry[] | null = null;

export function setRuleOwnerMaster(entries: RuleOwnerMasterEntry[]): void {
  ruleOwnerMasterOverride = entries;
}

export function resetRuleOwnerMaster(): void {
  ruleOwnerMasterOverride = null;
}

export function getRuleOwnerMaster(): RuleOwnerMasterEntry[] {
  return (ruleOwnerMasterOverride ?? DEFAULT_RULE_OWNER_MASTER)
    .filter((e) => e.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export const RULE_OWNER_LABELS: Record<RuleOwnerId, string> = DEFAULT_RULE_OWNER_MASTER.reduce(
  (acc, entry) => {
    acc[entry.id] = entry.label;
    return acc;
  },
  {} as Record<RuleOwnerId, string>,
);

