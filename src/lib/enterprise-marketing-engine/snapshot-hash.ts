/**
 * CO-MARKETING-REDESIGN-003 — Deterministic snapshot hash for a frozen audience.
 */

import { createHash } from "node:crypto";
import type { MarketingColumnMap } from "@/types/enterprise-marketing-durability";
import type { MarketingFilterDefinition } from "@/types/enterprise-marketing-audience";
import type { MarketingEligibleRecipientDraft } from "@/lib/enterprise-marketing-engine/eligibility-scan";

export function hashMarketingAudienceSnapshot(input: {
  workbookId: string;
  tabId: string;
  tabName: string;
  mapping: MarketingColumnMap;
  inclusion: MarketingFilterDefinition;
  exclusion: MarketingFilterDefinition;
  recipients: Array<Pick<MarketingEligibleRecipientDraft, "sourceStableKey" | "normalizedEmail">>;
}): string {
  const payload = {
    workbookId: input.workbookId,
    tabId: input.tabId,
    tabName: input.tabName,
    mapping: input.mapping,
    inclusion: input.inclusion,
    exclusion: input.exclusion,
    recipients: input.recipients.map((r) => `${r.sourceStableKey}|${r.normalizedEmail}`),
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
