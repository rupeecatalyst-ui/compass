/**
 * CO-UX-006 — Today's Fresh Logins KPI loader (User Home Dashboard).
 */

import { enterpriseOpportunityApiClient } from "@/lib/enterprise-opportunity/opportunity-api-client";
import type { FreshLoginKpiBucketId } from "@/constants/opportunity-business-source";

export type FreshLoginKpiCounts = Record<
  Exclude<FreshLoginKpiBucketId, never>,
  number
>;

export async function loadFreshLoginKpiCounts(): Promise<{
  asOf: string;
  definition: string;
  counts: {
    direct: number;
    channel_partner: number;
    referral: number;
    other: number;
    total: number;
  };
}> {
  return enterpriseOpportunityApiClient.getFreshLoginKpis();
}
