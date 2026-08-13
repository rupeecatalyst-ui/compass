/**
 * CO-MARKETING-MKT-10 — Analytics constants (time ranges, event types, capability notes).
 */

import type { MarketingChannel } from "./lifecycle";
import type {
  MarketingChannelEventCapability,
  MarketingEngagementEventType,
} from "@/types/enterprise-marketing-analytics";
import { MARKETING_ENGAGEMENT_EVENT_TYPES, MARKETING_ANALYTICS_RANGE_PRESETS } from "@/types/enterprise-marketing-analytics";

export { MARKETING_ANALYTICS_RANGE_PRESETS, MARKETING_ENGAGEMENT_EVENT_TYPES };

export const MARKETING_ANALYTICS_RANGE_LABELS: Record<
  "today" | "last_3_days" | "last_7_days" | "last_30_days" | "custom",
  string
> = {
  today: "Today",
  last_3_days: "Last 3 days",
  last_7_days: "Last 7 days",
  last_30_days: "Last 30 days",
  custom: "Custom",
};

/** Default dashboard range — matches ARCH / MKT-10 time-range helper default. */
export const MARKETING_ANALYTICS_DEFAULT_PRESET = "last_7_days" as const;

export const MARKETING_ANALYTICS_ENGAGEMENT_PAGE_SIZE = 50 as const;
export const MARKETING_ANALYTICS_DRILLDOWN_PAGE_SIZE = 50 as const;

const UNSUPPORTED_DRY_RUN: Partial<Record<MarketingEngagementEventType, string>> = {
  DELIVERED: "Dry-run adapters do not receive provider delivery receipts.",
  OPENED: "Open tracking requires a live provider webhook — not invented.",
  CLICKED: "Click tracking requires a live provider webhook — not invented.",
  REPLIED: "Inbound reply capture is not enabled in this sprint.",
  BOUNCED: "Bounce webhooks require a live provider — not invented.",
};

function allUnsupported(
  notes: Partial<Record<MarketingEngagementEventType, string>>,
): Record<MarketingEngagementEventType, boolean> {
  const supported = {} as Record<MarketingEngagementEventType, boolean>;
  for (const t of MARKETING_ENGAGEMENT_EVENT_TYPES) supported[t] = false;
  void notes;
  return supported;
}

function dryRunSupported(handoffEnabled: boolean): Record<MarketingEngagementEventType, boolean> {
  return {
    SENT: true,
    DELIVERED: false,
    OPENED: false,
    CLICKED: false,
    REPLIED: false,
    UNSUBSCRIBED: true,
    BOUNCED: false,
    FAILED: true,
    SUPPRESSED: true,
    QUALIFIED: handoffEnabled,
    HANDED_OFF: handoffEnabled,
  };
}

export function marketingChannelEventCapabilities(input: {
  emailMode: "off" | "dry_run" | "live";
  whatsappMode: "off" | "dry_run" | "live";
  handoffEnabled?: boolean;
}): MarketingChannelEventCapability[] {
  const handoffEnabled = input.handoffEnabled === true;
  const emailSupported =
    input.emailMode === "off"
      ? allUnsupported(UNSUPPORTED_DRY_RUN)
      : dryRunSupported(handoffEnabled);
  const waSupported =
    input.whatsappMode === "off"
      ? allUnsupported(UNSUPPORTED_DRY_RUN)
      : dryRunSupported(handoffEnabled);
  const digitalSupported = allUnsupported({
    SENT: "Digital campaigns are not implemented.",
  });

  const qualificationNotes: Partial<Record<MarketingEngagementEventType, string>> = handoffEnabled
    ? {
        QUALIFIED: "Counted from QUALIFIED engagement events and qualification records.",
        HANDED_OFF: "Counted from HANDED_OFF events and Opportunity handoff records.",
      }
    : {
        QUALIFIED: "Qualification handoff is disabled — not invented.",
        HANDED_OFF: "Operational handoff is disabled — Opportunity counts are not invented.",
      };

  const email: MarketingChannelEventCapability = {
    channel: "EMAIL",
    mode: input.emailMode,
    supported: emailSupported,
    notes: {
      ...UNSUPPORTED_DRY_RUN,
      ...qualificationNotes,
      SENT: "Counted from dry-run / provider SENT events and successful delivery outcomes.",
      FAILED: "Counted from FAILED events and execution ledger failures.",
      SUPPRESSED: "Counted from execution ledger suppression and SUPPRESSED events.",
      UNSUBSCRIBED: "Counted from org suppression records (UNSUBSCRIBE) and UNSUBSCRIBED events.",
    },
  };
  const whatsapp: MarketingChannelEventCapability = {
    channel: "WHATSAPP",
    mode: input.whatsappMode,
    supported: waSupported,
    notes: {
      ...UNSUPPORTED_DRY_RUN,
      ...qualificationNotes,
      SENT: "Counted from dry-run / provider SENT events and successful delivery outcomes.",
      FAILED: "Counted from FAILED events and execution ledger failures.",
      SUPPRESSED: "Counted from execution ledger suppression and SUPPRESSED events.",
      UNSUBSCRIBED: "Counted from org suppression records (UNSUBSCRIBE) and UNSUBSCRIBED events.",
      DELIVERED: "WhatsApp delivery receipts require a live Business API webhook — not invented.",
    },
  };
  const digital: MarketingChannelEventCapability = {
    channel: "DIGITAL" satisfies MarketingChannel,
    mode: "disabled",
    supported: digitalSupported,
    notes: {
      SENT: "Digital campaigns are not implemented.",
      QUALIFIED: "Digital campaigns are not implemented.",
      HANDED_OFF: "Digital campaigns are not implemented.",
    },
  };
  return [email, whatsapp, digital];
}

export const MARKETING_ANALYTICS_NOTICE =
  "MKT-10 analytics are derived from campaign execution ledger + engagement events. Audience source rows are never copied. Unsupported provider events show as Unavailable — never as invented zeros presented as truth.";
