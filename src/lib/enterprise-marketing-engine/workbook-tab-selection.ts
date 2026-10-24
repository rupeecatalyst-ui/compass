/**
 * Marketing workbook ↔ tab selection.
 * Tab identity is scoped to the selected bindingId. Never keep a previous
 * workbook's sourceTabId/datasetId after the operator switches workbooks.
 */

export type MarketingWorkbookTabOption = {
  externalDatasetId: string;
  displayName?: string;
};

export function isMarketingWorkbookTabDiscoveryCurrent(input: {
  selectedBindingId: string;
  discoveryBindingId: string;
}): boolean {
  return Boolean(input.selectedBindingId) && input.selectedBindingId === input.discoveryBindingId;
}

export function marketingTabBelongsToDiscoveredWorkbook(
  datasetId: string,
  tabs: MarketingWorkbookTabOption[],
): boolean {
  const id = datasetId.trim();
  if (!id) return false;
  return tabs.some((tab) => tab.externalDatasetId === id);
}

/**
 * Resolve which tab to keep after a tab-discovery response.
 *
 * - Stale responses (discoveryBindingId ≠ selectedBindingId) are ignored.
 * - Workbook switch never retains the previous workbook's datasetId, even if
 *   the gid/id string coincidentally exists on the new workbook, unless
 *   `preferredDatasetId` was supplied from a persisted audience definition.
 * - Same-workbook refresh keeps the current tab when it is still in the list.
 * - Empty same-workbook selection (Home Loan first load) takes the first tab.
 * - Invalid / missing tabs fail closed (datasetId "").
 */
export function resolveMarketingWorkbookTabSelection(input: {
  selectedBindingId: string;
  discoveryBindingId: string;
  tabs: MarketingWorkbookTabOption[];
  currentDatasetId: string;
  bindingChanged: boolean;
  preferredDatasetId?: string | null;
}): { apply: boolean; datasetId: string } {
  if (!isMarketingWorkbookTabDiscoveryCurrent(input)) {
    return { apply: false, datasetId: input.currentDatasetId };
  }

  const ids = new Set(
    input.tabs.map((tab) => tab.externalDatasetId).filter((id) => Boolean(id?.trim())),
  );
  const preferred = (input.preferredDatasetId ?? "").trim();
  if (preferred) {
    return { apply: true, datasetId: ids.has(preferred) ? preferred : "" };
  }

  if (input.bindingChanged) {
    return { apply: true, datasetId: "" };
  }

  const current = input.currentDatasetId.trim();
  if (current) {
    return { apply: true, datasetId: ids.has(current) ? current : "" };
  }

  const first = input.tabs[0]?.externalDatasetId?.trim() ?? "";
  return { apply: true, datasetId: first };
}
