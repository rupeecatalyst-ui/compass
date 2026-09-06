import type {
  AdvantageCommittedEventKind,
  AdvantageCommittedStatus,
} from "@/constants/advantage-committed";

export type AdvantageCommittedRecord = {
  opportunityId: string;
  organizationId: string;
  amount: string | null;
  currency: "INR" | null;
  status: AdvantageCommittedStatus;
  display: string;
  productCode: string | null;
  committedAt: string | null;
  committedByUserId: string | null;
  commitmentId: string | null;
  commitmentVersion: number;
  marketingCampaignId: string | null;
  marketingCampaignName: string | null;
  marketingSource: string | null;
  marketingSourceDetail: string | null;
  marketingProspectRef: string | null;
};

export type AdvantageCommittedCorrectionInput = {
  opportunityId: string;
  originalAmount: string;
  revisedAmount: string;
  reason: string;
  requestedByUserId: string;
  approvedByUserId: string;
};

export type AdvantageCommittedHistoryEvent = {
  id: string;
  opportunityId: string;
  organizationId: string;
  eventKind: AdvantageCommittedEventKind;
  amount: string;
  previousAmount: string | null;
  currency: "INR";
  productCode: string | null;
  reason: string | null;
  requestedByUserId: string;
  approvedByUserId: string | null;
  originatingOpportunityId: string;
  originalCommitmentId: string | null;
  version: number;
  createdAt: string;
};

export type AdvantageCommittedAccountingSnapshot = {
  originatingOpportunityId: string;
  originalCommitmentId: string | null;
  commitmentVersion: number;
  amount: string | null;
  currency: "INR" | null;
  status: AdvantageCommittedStatus;
  capturedAt: string;
};

export type AdvantageCommittedHandoffDecision = {
  ok: boolean;
  code:
    | "HANDOFF_OK"
    | "ADVANTAGE_COMMITTED_MISMATCH"
    | "ADVANTAGE_COMMITTED_REQUIRED_INCONSISTENCY";
  message: string;
};
