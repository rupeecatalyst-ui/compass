export {
  filterMyDealRows,
  groupDealsByKanbanColumn,
  listMyDealRows,
  mapLoanFileToDealRow,
  resolveCurrentRmName,
  type MyDealRow,
} from "./derive-rows";

export {
  classifyDealActivity,
  countDealsByActivity,
  matchesDealActivityFilter,
  matchesDealStageFilter,
  MY_DEALS_ACTIVE_LENDER_STAGES,
  MY_DEALS_INACTIVE_LENDER_STAGES,
  type DealActivityClassification,
  type DealActivityFilter,
} from "./classify-deal-activity";

export {
  exportDealRegistryCsv,
  filterDealRegistryRows,
  listDealRegistryRows,
  mapLoanFileToDealRegistryRow,
  sortDealRegistryRows,
  uniqueDealValues,
} from "./deal-registry";

export {
  groupDealRowsByOpportunity,
  pickPreferredDealForOpportunity,
  sortOpportunityGroups,
  type OpportunityRegistryGroup,
} from "./group-opportunities";

export { filterLoanDealRegistryRows, isLoanDealRegistryRow } from "./loan-deals";

export {
  groupDealsForMyDealsKanban,
  resolveMyDealsKanbanColumnId,
  isAccountingKanbanColumn,
} from "./kanban-board";

export {
  deriveOpportunityExecutiveSummary,
  type OpportunityExecutiveSummary,
} from "./derive-opportunity-executive-summary";
