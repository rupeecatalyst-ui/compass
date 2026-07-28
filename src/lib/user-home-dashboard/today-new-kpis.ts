/**
 * Today's New Opportunities / Deals KPI loaders (User Home Dashboard).
 */

import { enterpriseOpportunityApiClient } from "@/lib/enterprise-opportunity/opportunity-api-client";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";

export async function loadTodayNewOpportunityKpiCounts() {
  return enterpriseOpportunityApiClient.getTodayNewOpportunityKpis();
}

export async function loadTodayNewDealKpiCounts() {
  return enterpriseDealApiClient.getTodayNewDealKpis();
}
