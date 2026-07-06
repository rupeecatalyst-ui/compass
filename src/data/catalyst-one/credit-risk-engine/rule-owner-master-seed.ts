import type { RuleOwnerId } from "@/types/rule-library";

/**
 * CRC-10.3A.4 — Rule Owner master seed (Admin Console will manage overrides at runtime).
 */
export interface RuleOwnerMasterEntry {
  id: RuleOwnerId;
  label: string;
  enabled: boolean;
  sortOrder: number;
}

export const DEFAULT_RULE_OWNER_MASTER: RuleOwnerMasterEntry[] = [
  { id: "credit_team", label: "Credit Team", enabled: true, sortOrder: 1 },
  { id: "risk_team", label: "Risk Team", enabled: true, sortOrder: 2 },
  { id: "operations", label: "Operations", enabled: true, sortOrder: 3 },
  { id: "compliance", label: "Compliance", enabled: true, sortOrder: 4 },
  { id: "finance", label: "Finance", enabled: true, sortOrder: 5 },
  { id: "admin", label: "Admin", enabled: true, sortOrder: 6 },
  { id: "other", label: "Other", enabled: true, sortOrder: 7 },
];

