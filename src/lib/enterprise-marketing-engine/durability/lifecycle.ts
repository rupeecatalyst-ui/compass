/**
 * CO-MARKETING-REDESIGN-001 — Lifecycle action validation.
 * Rejects illegal transitions. SAVE never publishes or sends.
 */

import type { MarketingCampaignAction, MarketingCampaignStatus } from "@/constants/enterprise-marketing-engine/lifecycle";
import {
  MARKETING_ACTION_TARGET_STATUS,
  MARKETING_LEGAL_TRANSITIONS,
  assertMarketingTransitionAllowed,
  isMarketingTransitionAllowed,
} from "@/constants/enterprise-marketing-engine/transitions";

const READ_ONLY_STATUSES: ReadonlySet<MarketingCampaignStatus> = new Set([
  "COMPLETED",
  "STOPPED",
  "CANCELLED",
]);

export function resolveMarketingActionTargetStatus(
  from: MarketingCampaignStatus,
  action: MarketingCampaignAction,
  resumeTarget: "RUNNING" | "SCHEDULED" = "RUNNING",
): MarketingCampaignStatus {
  if (action === "SAVE") return from;
  if (action === "RESUME") return resumeTarget === "SCHEDULED" ? "SCHEDULED" : "RUNNING";
  const target = MARKETING_ACTION_TARGET_STATUS[action];
  if (!target) {
    throw Object.assign(new Error(`Action ${action} has no lifecycle target`), {
      statusCode: 400,
      code: "INVALID_LIFECYCLE_ACTION",
    });
  }
  return target;
}

export function assertMarketingActionAllowed(
  from: MarketingCampaignStatus,
  action: MarketingCampaignAction,
  resumeTarget: "RUNNING" | "SCHEDULED" = "RUNNING",
): MarketingCampaignStatus {
  if (action === "SAVE") {
    if (READ_ONLY_STATUSES.has(from)) {
      throw Object.assign(new Error(`Cannot save a ${from} campaign`), {
        statusCode: 400,
        code: "ILLEGAL_LIFECYCLE_TRANSITION",
      });
    }
    return from;
  }
  const to = resolveMarketingActionTargetStatus(from, action, resumeTarget);
  assertMarketingTransitionAllowed(from, to);
  if (action === "PAUSE" && to !== "PAUSED") {
    throw Object.assign(new Error("PAUSE must target PAUSED"), {
      statusCode: 400,
      code: "ILLEGAL_LIFECYCLE_TRANSITION",
    });
  }
  if (action === "STOP" && to !== "STOPPED") {
    throw Object.assign(new Error("STOP must target STOPPED"), {
      statusCode: 400,
      code: "ILLEGAL_LIFECYCLE_TRANSITION",
    });
  }
  if (action === "RESUME" && from !== "PAUSED") {
    throw Object.assign(new Error("RESUME is only legal from PAUSED"), {
      statusCode: 400,
      code: "ILLEGAL_LIFECYCLE_TRANSITION",
    });
  }
  return to;
}

export function listLegalMarketingNextStatuses(
  from: MarketingCampaignStatus,
): readonly MarketingCampaignStatus[] {
  return MARKETING_LEGAL_TRANSITIONS[from];
}

export { isMarketingTransitionAllowed, assertMarketingTransitionAllowed };
