/**
 * CO-C1-CONTACT-STRATEGY-STICKY-NOTES-007
 * Operational Contact Strategy — relationship planning workspace contracts.
 */

import type { RelationshipEngagementBand } from "@/types/relationship-heat-map";

export const CONTACT_STRATEGY_SPRINT =
  "CO-C1-CONTACT-STRATEGY-STICKY-NOTES-007" as const;

export type ContactStrategyActivityBand = RelationshipEngagementBand;

export type ContactStrategyPreferredChannel =
  | "call"
  | "email"
  | "whatsapp"
  | "meeting";

export type ContactStrategyCadence =
  | "weekly"
  | "fortnightly"
  | "monthly"
  | "quarterly"
  | "as_needed";

export type ContactStrategyKpiId =
  | "strategic"
  | "due_today"
  | "needs_attention"
  | "dormant"
  | "upcoming_meetings";

export type ContactStrategyRelationshipPlan = {
  contactId: string;
  objective: string | null;
  cadence: ContactStrategyCadence | null;
  preferredChannel: ContactStrategyPreferredChannel | null;
  nextReviewAt: string | null;
  assignedOwnerUserId: string | null;
  assignedOwnerName: string | null;
};

export type ContactStrategyRow = {
  contactId: string;
  contactName: string;
  companyId: string | null;
  companyName: string | null;
  contactRole: string;
  relationshipState: ContactStrategyActivityBand;
  relationshipScore: number;
  lastMeaningfulAt: string | null;
  lastMeaningfulLabel: string | null;
  lastMeaningfulChannel: string | null;
  daysSinceMeaningful: number | null;
  assignedEmployeeId: string | null;
  assignedEmployeeName: string | null;
  opportunityId: string | null;
  opportunityRef: string | null;
  dealId: string | null;
  dealRef: string | null;
  businessValue: number;
  nextAction: string | null;
  nextActionDueOn: string | null;
  cadence: ContactStrategyCadence | null;
  preferredChannel: ContactStrategyPreferredChannel | null;
  strategic: boolean;
  upcomingMeetingAt: string | null;
  relationshipObjective: string | null;
  nextReviewAt: string | null;
  recentMeaningful: Array<{
    at: string;
    label: string;
    channel: string;
  }>;
};

export type ContactStrategyKpis = Record<ContactStrategyKpiId, number>;

export type ContactStrategyFilters = {
  q?: string;
  relationshipState?: ContactStrategyActivityBand | "all";
  contactRole?: string | "all";
  assignedEmployeeId?: string | "all";
  companyId?: string | "all";
  linkedTransaction?: "all" | "opportunity" | "deal" | "none";
  nextActionDue?: "all" | "overdue" | "today" | "upcoming";
  activityBand?: ContactStrategyActivityBand | "all";
  kpi?: ContactStrategyKpiId | null;
};

export type ContactStrategySnapshot = {
  sprint: typeof CONTACT_STRATEGY_SPRINT;
  asOf: string;
  kpis: ContactStrategyKpis;
  rows: ContactStrategyRow[];
  total: number;
};
