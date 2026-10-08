"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { OperationalDesk } from "@/components/catalyst-one/case-workbench/operational-desk";
import { subscribeDealsUpdated } from "@/lib/enterprise-deal/deal-data-access";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import { mapEnterpriseOpportunityToRegistryRow } from "@/lib/enterprise-opportunity/map-opportunity-to-registry-row";
import { enterpriseOpportunityApiClient } from "@/lib/enterprise-opportunity/opportunity-api-client";
import { subscribeOpportunitiesUpdated } from "@/lib/enterprise-opportunity/opportunity-data-sync";
import { resolveCanonicalProductCode } from "@/constants/enterprise-product-master/canonical-catalog";
import {
  applyDeskRefresh,
  CASE_WORKBENCH_DEAL_PAGE_SIZE,
  CASE_WORKBENCH_OPPORTUNITY_PAGE_SIZE,
  formatDeskAmount,
  isActiveUnconvertedOpportunity,
  joinPagedItems,
  mapRegistryDealToDeskInput,
  pageCount,
  type DeskDealInput,
  type DeskOpportunity,
} from "@/lib/case-workbench/operational-desk";

async function loadAuthorizedDeals(): Promise<DeskDealInput[]> {
  const first = await enterpriseDealApiClient.searchDeals({
    page: 1,
    pageSize: CASE_WORKBENCH_DEAL_PAGE_SIZE,
    archived: false,
    view: "summary",
  });
  const pages = [first];
  const count = pageCount(first.total, first.pageSize || CASE_WORKBENCH_DEAL_PAGE_SIZE);
  for (let page = 2; page <= count; page += 1) {
    pages.push(
      await enterpriseDealApiClient.searchDeals({
        page,
        pageSize: CASE_WORKBENCH_DEAL_PAGE_SIZE,
        archived: false,
        view: "summary",
      }),
    );
  }
  const joined = joinPagedItems(pages);
  if (!joined.complete) {
    throw new Error(`Authorized Deal list is incomplete (${joined.items.length} of ${joined.total}).`);
  }
  return joined.items.flatMap((row) => {
    const mapped = mapRegistryDealToDeskInput(row);
    return mapped ? [mapped] : [];
  });
}

async function loadAuthorizedOpportunities(): Promise<DeskOpportunity[]> {
  const pageSize = CASE_WORKBENCH_OPPORTUNITY_PAGE_SIZE;
  const first = await enterpriseOpportunityApiClient.searchOpportunities({
    limit: pageSize,
    offset: 0,
    orderBy: "updatedAt",
  });
  const pages = [first];
  const count = pageCount(first.total, first.limit || pageSize);
  for (let page = 1; page < count; page += 1) {
    pages.push(
      await enterpriseOpportunityApiClient.searchOpportunities({
        limit: pageSize,
        offset: page * (first.limit || pageSize),
        orderBy: "updatedAt",
      }),
    );
  }
  const joined = joinPagedItems(pages);
  if (!joined.complete) {
    throw new Error(
      `Authorized Opportunity list is incomplete (${joined.items.length} of ${joined.total}).`,
    );
  }
  return joined.items.map((row) => {
    const mapped = mapEnterpriseOpportunityToRegistryRow(row);
    return {
      id: mapped.id,
      opportunityNumber: mapped.opportunityNumber,
      customerName: mapped.customerName?.trim() || "Not Specified",
      product: mapped.product?.trim() || "Not Specified",
      stageLabel: mapped.opportunityStageLabel?.trim() || mapped.statusLabel || "Not Specified",
      status: mapped.status,
      updatedAt: mapped.updatedAt,
      amountLabel: formatDeskAmount(mapped.requestedAmount),
      contactId: mapped.primaryContactId,
      productCode: resolveCanonicalProductCode(row.productCode || row.productLabel),
      ownerUserId: row.primaryOwnerUserId?.trim() || row.relationshipManagerUserId?.trim() || null,
    };
  }).filter((row) => isActiveUnconvertedOpportunity(row.status));
}

/**
 * Case Workbench reads the authorized Deal and Opportunity registries.
 * It does not score, classify, or replace CHANAKYA Radar.
 */
export function CaseWorkbench() {
  const [deals, setDeals] = useState<DeskDealInput[]>([]);
  const [opportunities, setOpportunities] = useState<DeskOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const reload = useCallback(async () => {
    const ticket = ++generation.current;
    try {
      const [nextDeals, nextOpportunities] = await Promise.all([
        loadAuthorizedDeals(),
        loadAuthorizedOpportunities(),
      ]);
      if (ticket !== generation.current) return;
      setDeals((current) => applyDeskRefresh(current, { ok: true, data: nextDeals }).data);
      setOpportunities((current) =>
        applyDeskRefresh(current, { ok: true, data: nextOpportunities }).data,
      );
      setError(null);
    } catch (err) {
      if (ticket !== generation.current) return;
      const message = err instanceof Error ? err.message : "Case Workbench could not refresh.";
      setDeals((current) => applyDeskRefresh(current, { ok: false, message }).data);
      setOpportunities((current) => applyDeskRefresh(current, { ok: false, message }).data);
      setError(message);
    } finally {
      if (ticket === generation.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const stopDeals = subscribeDealsUpdated(() => {
      void reload();
    });
    const stopOpportunities = subscribeOpportunitiesUpdated(() => {
      void reload();
    });
    return () => {
      stopDeals();
      stopOpportunities();
    };
  }, [reload]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <OperationalDesk
        opportunities={opportunities}
        deals={deals}
        loading={loading}
        error={error}
      />
    </div>
  );
}
