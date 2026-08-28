/**
 * CO-CHANAKYA-PHASE1-INAPP-CONVERSATION-CLOSURE-037
 * Employee in-app Ask CHANAKYA — read-only multi-turn conversation contracts.
 */

import type {
  ChanakyaChangePeriod,
  ChanakyaEnterpriseReadMode,
} from "@/types/chanakya-enterprise-read-context";

export const CHANAKYA_INAPP_CONVERSATION_SPRINT =
  "CO-CHANAKYA-PHASE1-INAPP-CONVERSATION-CLOSURE-037" as const;

export type ChanakyaInappIntent =
  | "focus_first"
  | "intervention_queue"
  | "sla_delayed"
  | "why_stuck"
  | "what_changed"
  | "analyse_financials"
  | "lenders_relevant"
  | "what_next"
  | "general_desk";

export type ChanakyaInappMessageRole = "user" | "assistant" | "system";

export type ChanakyaInappEntityRefs = {
  opportunityId?: string | null;
  dealId?: string | null;
};

export type ChanakyaInappMessage = {
  id: string;
  role: ChanakyaInappMessageRole;
  text: string;
  createdAt: string;
  intent?: ChanakyaInappIntent;
  provenance: string[];
  availabilityNotes: string[];
  entityRefs?: ChanakyaInappEntityRefs;
};

export type ChanakyaInappSession = {
  sessionId: string;
  actorUserId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  messages: ChanakyaInappMessage[];
  /** Continuity — last entity the conversation was discussing. */
  activeEntity: ChanakyaInappEntityRefs;
  lastIntent: ChanakyaInappIntent | null;
  readOnly: true;
};

export type ChanakyaInappTurnRequest = {
  sessionId?: string | null;
  message: string;
  opportunityId?: string | null;
  dealId?: string | null;
  changePeriod?: ChanakyaChangePeriod | null;
};

export type ChanakyaInappCompilePlan = {
  mode: ChanakyaEnterpriseReadMode;
  changePeriod?: ChanakyaChangePeriod;
  requireEntity: boolean;
  domains?: import("@/types/chanakya-enterprise-read-context").ChanakyaEnterpriseReadDomain[];
};

export type ChanakyaInappTurnResult = {
  sprint: typeof CHANAKYA_INAPP_CONVERSATION_SPRINT;
  sessionId: string;
  readOnly: true;
  correlationId: string;
  intent: ChanakyaInappIntent;
  compileMode: ChanakyaEnterpriseReadMode | null;
  reply: ChanakyaInappMessage;
  messages: ChanakyaInappMessage[];
  activeEntity: ChanakyaInappEntityRefs;
  limitations: string[];
  errorCode?: string | null;
};
