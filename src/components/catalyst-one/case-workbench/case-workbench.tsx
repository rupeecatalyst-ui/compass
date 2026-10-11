"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthContext } from "@/components/providers/auth-provider";
import { loadDeskPopulations, type DeskPopulation } from "@/lib/case-workbench/load-populations";
import { OperationalDesk } from "@/components/catalyst-one/case-workbench/operational-desk";
import { subscribeDealsUpdated } from "@/lib/enterprise-deal/deal-data-access";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import { mapEnterpriseOpportunityToRegistryRow } from "@/lib/enterprise-opportunity/map-opportunity-to-registry-row";
import { enterpriseOpportunityApiClient } from "@/lib/enterprise-opportunity/opportunity-api-client";
import { subscribeOpportunitiesUpdated } from "@/lib/enterprise-opportunity/opportunity-data-sync";
import { resolveCanonicalProductCode } from "@/constants/enterprise-product-master/canonical-catalog";
import {
  applyPersistedDeskActivity,
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
      ownerName: !row.primaryOwnerUserId || row.primaryOwnerUserId === row.relationshipManagerUserId ? row.relationshipManagerName?.trim() || null : null,
    };
  }).filter((row) => isActiveUnconvertedOpportunity(row.status));
}

/**
 * Case Workbench reads the authorized Deal and Opportunity registries.
 * It does not score, classify, or replace CHANAKYA Radar.
 */
export function CaseWorkbench() {
  const { user } = useAuthContext();
  return <CaseWorkbenchSession key={user?.id ?? "signed-out"} authenticated={Boolean(user?.id)} />;
}

function CaseWorkbenchSession({ authenticated }: { authenticated: boolean }) {
  const [dealState, setDealState] = useState<DeskPopulation<DeskDealInput>>({ items: [], loading: true, error: null });
  const [opportunityState, setOpportunityState] = useState<DeskPopulation<DeskOpportunity>>({ items: [], loading: true, error: null });
  const generation = useRef(0);

  const reload = useCallback(async () => {
    const ticket = ++generation.current;
    if (!authenticated) {
      setDealState({ items: [], loading: false, error: null });
      setOpportunityState({ items: [], loading: false, error: null });
      return;
    }
    await loadDeskPopulations({
      loadDeals: loadAuthorizedDeals,
      loadOpportunities: loadAuthorizedOpportunities,
      isCurrent: () => ticket === generation.current,
      onDeals: setDealState,
      onOpportunities: setOpportunityState,
    });
  }, [authenticated]);

  useEffect(() => {
    void reload();
    return () => { generation.current += 1; };
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
        opportunities={opportunityState.items}
        deals={dealState.items}
        opportunityLoading={opportunityState.loading}
        dealLoading={dealState.loading}
        opportunityError={opportunityState.error}
        dealError={dealState.error}
        onActivitySaved={activity => {
          setDealState(current => ({ ...current, items: applyPersistedDeskActivity(current.items, [], activity).deals }));
          setOpportunityState(current => ({ ...current, items: applyPersistedDeskActivity([], current.items, activity).opportunities }));
        }}
      />
    </div>
  );
}
