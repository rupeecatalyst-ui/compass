/**
 * CO-MARKETING-MKT-11 — Qualification / Operational Handoff Port.
 *
 * Frozen path:
 *   Marketing → Qualified Response → ECM Contact → Dialogue Opportunity
 *
 * No Lead entity. Unqualified recipients must not enter this port.
 */

import type {
  MarketingHandoffResult,
  MarketingIdentityMatchResult,
  MarketingOpportunityHandoffResult,
  MarketingQualificationRecord,
} from "@/types/enterprise-marketing-qualification";

export type MarketingIdentityResolutionPort = {
  matchOrCreate(input: {
    organizationId: string;
    actorUserId: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  }): Promise<MarketingIdentityMatchResult>;
};

export type MarketingOpportunityCreatePort = {
  createDialogue(input: {
    organizationId: string;
    actorUserId: string;
    assigneeUserId: string;
    contactId: string;
    contactName?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    campaignId: string;
    campaignName?: string | null;
    qualificationId: string;
  }): Promise<MarketingOpportunityHandoffResult>;
};

export type MarketingQualificationHandoffPort = {
  handoff(input: {
    qualification: MarketingQualificationRecord;
    assigneeUserId: string;
    actorUserId: string;
    createOpportunity: boolean;
  }): Promise<MarketingHandoffResult>;
};
