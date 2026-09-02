/**
 * CO-C1-CHANAKYA-REALTIME-INTELLIGENCE-001
 * Multi-turn entity binding from the last grounded intervention queue.
 */

import type { ChanakyaInappEntityRefs } from "@/types/chanakya-inapp-conversation";
import type { ChanakyaInterventionCard } from "@/types/chanakya-conversation-intelligence";

export function looksLikeOrdinalFollowUp(message: string): boolean {
  const q = (message || "").trim().toLowerCase();
  return /\b(the )?(first|1st|second|2nd|third|3rd) one\b|\bthat (one|deal|case|loan)\b|\bwhy is (it|this) stuck\b|\bwho is handling (it|this)\b|\bwhat should i ask\b|\bcompare (it|this|them)\b/.test(
    q,
  );
}

export function ordinalIndexFromMessage(message: string): number | null {
  const q = (message || "").trim().toLowerCase();
  if (/\b(first|1st) one\b|\bthe first\b/.test(q)) return 0;
  if (/\b(second|2nd) one\b/.test(q)) return 1;
  if (/\b(third|3rd) one\b/.test(q)) return 2;
  if (/\bthat (one|deal|case|loan)\b|\b(it|this) stuck\b|\bhandling (it|this)\b|\bcompare (it|this)\b/.test(q)) {
    return 0;
  }
  return null;
}

export function bindFollowUpEntity(input: {
  message: string;
  requestEntity: ChanakyaInappEntityRefs;
  sessionEntity: ChanakyaInappEntityRefs;
  focusCards: ChanakyaInterventionCard[];
}): ChanakyaInappEntityRefs {
  const requested: ChanakyaInappEntityRefs = {
    opportunityId: input.requestEntity.opportunityId?.trim() || null,
    dealId: input.requestEntity.dealId?.trim() || null,
  };
  if (requested.opportunityId || requested.dealId) return requested;

  const idx = ordinalIndexFromMessage(input.message);
  if (idx != null && input.focusCards[idx]) {
    const card = input.focusCards[idx];
    return {
      opportunityId: card.opportunityId || card.opportunityRef || null,
      dealId: card.dealId || card.dealRef || null,
    };
  }

  if (looksLikeOrdinalFollowUp(input.message) && input.focusCards[0]) {
    const card = input.focusCards[0];
    return {
      opportunityId: card.opportunityId || card.opportunityRef || null,
      dealId: card.dealId || card.dealRef || null,
    };
  }

  return {
    opportunityId: input.sessionEntity.opportunityId?.trim() || null,
    dealId: input.sessionEntity.dealId?.trim() || null,
  };
}

export function sessionBelongsToActor(input: {
  sessionActorUserId: string;
  sessionOrganizationId: string;
  actorUserId: string;
  organizationId: string;
}): boolean {
  return (
    input.sessionActorUserId === input.actorUserId &&
    input.sessionOrganizationId === input.organizationId
  );
}
