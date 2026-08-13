/**
 * CO-MARKETING-MKT-11 — Qualification + operational handoff types.
 * Raw marketing recipients are not Contacts, Opportunities, or Leads.
 */

import type { MarketingChannel } from "@/constants/enterprise-marketing-engine";
import type { MarketingRoutingCriterionField } from "@/constants/enterprise-marketing-engine/routing";
import type { MarketingNotificationAttemptStatus } from "@/constants/enterprise-marketing-engine/notification";
import type { MarketingRoutingMode } from "@/lib/enterprise-marketing-engine/ports/routing.port";

/** Operator-facing business states (PO list + ARCH-001 equivalents). */
export const MARKETING_QUALIFICATION_BUSINESS_STATES = [
  "UNQUALIFIED",
  "ENGAGED",
  "RESPONSE_RECEIVED",
  "QUALIFICATION_REQUIRED",
  "QUALIFIED",
  "NOT_INTERESTED",
  "SUPPRESSED",
  "HANDED_OFF",
] as const;

export type MarketingQualificationBusinessState =
  (typeof MARKETING_QUALIFICATION_BUSINESS_STATES)[number];

/** ARCH-001 handoff process states. */
export const MARKETING_HANDOFF_PROCESS_STATES = [
  "NEW",
  "ROUTING",
  "HANDOFF_IN_PROGRESS",
  "HANDOFF_COMPLETE",
  "HANDOFF_FAILED",
] as const;

export type MarketingHandoffProcessState = (typeof MARKETING_HANDOFF_PROCESS_STATES)[number];

export type MarketingQualificationIntent =
  | "none"
  | "open"
  | "click"
  | "reply"
  | "enquiry"
  | "explicit_requirement"
  | "not_interested"
  | "unsubscribe";

export type MarketingQualificationPolicy = {
  /** Opens/clicks never auto-qualify. */
  autoQualifyOnOpen: false;
  autoQualifyOnClick: false;
  /** Replies become RESPONSE_RECEIVED, not QUALIFIED, unless explicit intent. */
  autoQualifyOnReply: false;
  requireExplicitIntent: boolean;
  requireIdentity: boolean;
  /** Operator must confirm QUALIFIED before handoff when true. */
  requireOperatorConfirm: boolean;
  /** Dialogue Opportunity only after QUALIFIED handoff — never from raw engagement. */
  createOpportunityOnHandoff: boolean;
};

export type MarketingRoutingMember = {
  userId: string;
  displayName: string;
  territory?: string | null;
  teamId?: string | null;
};

/** Closed-set rule — first match wins. Not a general-purpose engine. */
export type MarketingRoutingRule = {
  id: string;
  field: MarketingRoutingCriterionField;
  equals: string;
  assigneeUserId?: string | null;
  teamId?: string | null;
};

export type MarketingRoutingContext = {
  product?: string | null;
  customerCategory?: string | null;
  geography?: string | null;
  campaign?: string | null;
  source?: string | null;
  partner?: string | null;
  team?: string | null;
};

export type MarketingRoutingPolicy = {
  id: string;
  organizationId: string;
  name: string;
  mode: MarketingRoutingMode;
  /** SINGLE_USER target — configured, never hardcoded in code. */
  assigneeUserId?: string | null;
  /** TEAM mode — round-robin within members of this team. */
  teamId?: string | null;
  members: MarketingRoutingMember[];
  rrCursor: number;
  /** RULE_BASED closed criteria (product, category, geography, campaign, source, partner, team). */
  rules?: MarketingRoutingRule[];
  fallbackAssigneeUserId?: string | null;
  /** RULE_BASED geography fallback: match recipient city/territory to member.territory. */
  territoryField?: "city" | "territory";
  createdAt: string;
  updatedAt: string;
};

export type MarketingNotificationPolicy = {
  id: string;
  organizationId: string;
  name: string;
  inApp: boolean;
  email: boolean;
  whatsapp: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MarketingNotificationAttempt = {
  id: string;
  organizationId: string;
  qualificationId: string;
  channel: "in_app" | "email" | "whatsapp";
  status: MarketingNotificationAttemptStatus;
  dedupeKey: string;
  notificationId?: string | null;
  error?: string | null;
  retryCount: number;
  attemptedAt: string;
};

export type MarketingRouteAssignment = {
  qualificationId: string;
  assigneeUserId: string;
  mode: MarketingRoutingMode;
  routingPolicyId: string;
  assignedAt: string;
};

export type MarketingQualificationRecord = {
  id: string;
  organizationId: string;
  campaignId: string;
  campaignName?: string | null;
  channel: MarketingChannel;
  recipientFingerprint: string;
  /** Minimized match keys for ECM resolution — never a sheet-row dump. */
  matchEmail?: string | null;
  matchPhone?: string | null;
  displayName?: string | null;
  city?: string | null;
  territory?: string | null;
  product?: string | null;
  customerCategory?: string | null;
  source?: string | null;
  partnerId?: string | null;
  teamId?: string | null;
  intent: MarketingQualificationIntent;
  businessState: MarketingQualificationBusinessState;
  processState: MarketingHandoffProcessState;
  evidenceEventId?: string | null;
  assigneeUserId?: string | null;
  contactId?: string | null;
  contactCreated?: boolean;
  opportunityId?: string | null;
  opportunityCreated?: boolean;
  handedOffAt?: string | null;
  notificationStatus?: "PENDING" | "SENT" | "FAILED" | "PARTIAL" | null;
  notificationPolicyId?: string | null;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Public DTO — match identifiers redacted. */
export type MarketingQualificationPublicDto = Omit<
  MarketingQualificationRecord,
  "matchEmail" | "matchPhone"
> & {
  matchEmailPreview: string | null;
  matchPhonePreview: string | null;
};

export type MarketingIdentityMatchResult = {
  contactId: string;
  created: boolean;
  matchedBy: "email" | "phone" | "created";
  name: string;
};

export type MarketingOpportunityHandoffResult = {
  opportunityId: string;
  created: boolean;
  lifecycle: "dialogue";
};

export type MarketingHandoffNotificationSummary = {
  status: "SENT" | "FAILED" | "PARTIAL" | "SKIPPED";
  duplicate: boolean;
  attempts: MarketingNotificationAttempt[];
};

export type MarketingHandoffResult = {
  qualification: MarketingQualificationRecord;
  contact: MarketingIdentityMatchResult;
  opportunity: MarketingOpportunityHandoffResult | null;
  assignment: MarketingRouteAssignment;
  notification?: MarketingHandoffNotificationSummary | null;
};
