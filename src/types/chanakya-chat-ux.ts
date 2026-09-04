/**
 * CO-C1-CHANAKYA-CHAT-UX-011 — presentation contracts only.
 * Progressive-response event/metric types remain deferred and are not shipped.
 */

import type { ChanakyaCreditProposalDraft } from "@/types/chanakya-credit-proposal";

export type ChanakyaProposalSnapshotField = {
  label: string;
  value: string;
  missing: boolean;
};

export type ChanakyaProposalAccordionSection = {
  id: string;
  title: string;
  body: string;
  defaultOpen: boolean;
};

export type ChanakyaProposalPresentation = {
  snapshot: ChanakyaProposalSnapshotField[];
  executiveSummary: string;
  sections: ChanakyaProposalAccordionSection[];
  conversationText: string;
  draft: ChanakyaCreditProposalDraft;
};
