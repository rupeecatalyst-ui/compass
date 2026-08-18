/**
 * CO-ORG-003 — Enterprise Activity Registry public surface.
 */

export {
  emitEnterpriseActivity,
  emitEnterpriseActivityBestEffort,
  listEnterpriseActivity,
} from "./api-client";
export { hydrateEdcFromEar } from "./hydrate-edc";
export { mapEdcEntryToEarEmit, mapEarEventToEdcEntry } from "./map-edc";
export { mapEarEventToDashboardActivity } from "./map-dashboard";
export { mapEarEventToMissionControlActivity } from "./map-mission-control";
export {
  clearSessionEarRegistry,
  listSessionEarByDeal,
  listSessionEarByOpportunity,
  listSessionEarEvents,
  rememberEarEvent,
  rememberEarEvents,
  subscribeEarUpdated,
} from "./session-registry";
export {
  formatDealLastActivityLabel,
  latestOperationalOccurredAtByOpportunity,
  overlayDealRowsWithEarLastActivity,
} from "./latest-opportunity-activity";
export {
  TRANSACTION_TIMELINE_FILTERS,
  classifyEarEvent,
  filterEventsForScope,
  formatTimelineWhen,
  isOperationalTimelineEvent,
  loadTransactionActivityTimeline,
  mapEarEventToTimelineItem,
  matchesTimelineFilter,
  type TransactionTimelineCategory,
  type TransactionTimelineFilterId,
  type TransactionTimelineItem,
  type TransactionTimelineScope,
} from "./transaction-timeline";
