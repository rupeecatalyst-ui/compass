/**
 * CO-C1-CONTACT-STRATEGY-STICKY-NOTES-007 — Contact Strategy copy and catalogs.
 */

import type {
  ContactStrategyActivityBand,
  ContactStrategyCadence,
  ContactStrategyKpiId,
  ContactStrategyPreferredChannel,
} from "@/types/contact-strategy";

export const CONTACT_STRATEGY_TITLE = "Contact Strategy";

export const CONTACT_STRATEGY_SUBTITLE =
  "Relationship planning workspace — plan cadence, next actions, and follow-through from authorised Catalyst One records.";

export const CONTACT_STRATEGY_ACTIVITY_BANDS: Array<{
  id: ContactStrategyActivityBand;
  label: string;
  hint: string;
}> = [
  { id: "very_active", label: "Very Active", hint: "Meaningful interaction within 0–7 days" },
  { id: "active", label: "Active", hint: "8–30 days" },
  { id: "moderate", label: "Moderately Active", hint: "31–60 days" },
  { id: "needs_attention", label: "Needs Attention", hint: "61–90 days" },
  { id: "dormant", label: "Dormant", hint: "Over 90 days or no meaningful interaction" },
];

export const CONTACT_STRATEGY_KPI_CARDS: Array<{
  id: ContactStrategyKpiId;
  label: string;
}> = [
  { id: "strategic", label: "Strategic Contacts" },
  { id: "due_today", label: "Due Today" },
  { id: "needs_attention", label: "Needs Attention" },
  { id: "dormant", label: "Dormant" },
  { id: "upcoming_meetings", label: "Upcoming Meetings" },
];

export const CONTACT_STRATEGY_CHANNELS: Array<{
  id: ContactStrategyPreferredChannel;
  label: string;
}> = [
  { id: "call", label: "Call" },
  { id: "email", label: "Email" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "meeting", label: "Meeting" },
];

export const CONTACT_STRATEGY_CADENCES: Array<{
  id: ContactStrategyCadence;
  label: string;
}> = [
  { id: "weekly", label: "Weekly" },
  { id: "fortnightly", label: "Fortnightly" },
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "as_needed", label: "As needed" },
];

export function contactStrategyBandLabel(band: ContactStrategyActivityBand): string {
  return CONTACT_STRATEGY_ACTIVITY_BANDS.find((item) => item.id === band)?.label ?? band;
}

export function contactStrategyChannelLabel(
  channel: ContactStrategyPreferredChannel | string | null | undefined,
): string {
  if (!channel) return "Not set";
  return (
    CONTACT_STRATEGY_CHANNELS.find((item) => item.id === channel)?.label ?? String(channel)
  );
}
