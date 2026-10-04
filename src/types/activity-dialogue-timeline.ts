/**
 * CO-C1-ACTIVITY-DIALOGUE-TIMELINE-010
 * Organisation-wide Activity & Dialogue transaction timeline (EAR projection).
 */

export const DETAILED_TIMELINE_EVENT_TYPES = [
  "communications",
  "activities",
  "notes",
  "documents",
  "tasks",
  "stage_changes",
  "assignment_changes",
  "accounting",
  "system_events",
] as const;

export type DetailedTimelineEventType = (typeof DETAILED_TIMELINE_EVENT_TYPES)[number];

export const DETAILED_TIMELINE_STATUS_FILTERS = [
  "all",
  "needs_attention",
  "queued",
  "delivered",
  "completed",
  "pending_review",
  "failed",
] as const;

export type DetailedTimelineStatusFilter =
  (typeof DETAILED_TIMELINE_STATUS_FILTERS)[number];

export type DetailedTimelineExactWhen = {
  iso: string;
  dateLabel: string;
  timeWithSeconds: string;
  timezone: string;
  timezoneOffset: string;
  dayGroupKey: string;
  dayGroupLabel: string;
};

export type DetailedTimelineHrefSet = {
  openTransaction: string | null;
  customer: string | null;
  company: string | null;
  opportunity: string | null;
  deal: string | null;
  document: string | null;
  task: string | null;
  accounting: string | null;
};

export type DetailedTimelineRow = {
  id: string;
  sourceEventId: string | null;
  sourceSystem: string;
  eventKind: string;
  eventType: DetailedTimelineEventType;
  eventTypeLabel: string;
  title: string;
  explanation: string;
  actorLabel: string;
  actorRole: string;
  actorUserId: string | null;
  isSystemActor: boolean;
  systemProcess: string | null;
  occurredAt: string;
  when: DetailedTimelineExactWhen;
  sourceWorkspace: string;
  customerLabel: string | null;
  companyLabel: string | null;
  lenderId: string | null;
  lenderLabel: string | null;
  productLabel: string | null;
  loanAmountLabel: string | null;
  opportunityId: string | null;
  opportunityNumber: string | null;
  dealId: string | null;
  dealNumber: string | null;
  currentStage: string | null;
  beforeValue: string | null;
  afterValue: string | null;
  deliveryStatus: string | null;
  needsAttention: boolean;
  contactId: string | null;
  companyId: string | null;
  taskId: string | null;
  documentId: string | null;
  documentVersion: string | null;
  relatedOutboxId: string | null;
  relatedAccountingCaseId: string | null;
  inboundEmailId: string | null;
  hrefs: DetailedTimelineHrefSet;
  copyReference: string;
  technicalDetails: Record<string, unknown> | null;
};

export type DetailedTimelineCounts = {
  total: number;
  communications: number;
  stageChanges: number;
  documents: number;
  tasks: number;
  needsAttention: number;
  capped: boolean;
  complete: boolean;
};

export type DetailedTimelinePageInfo = {
  nextCursor: string | null;
  hasNextPage: boolean;
};

export type DetailedTimelinePage = {
  items: DetailedTimelineRow[];
  pageInfo: DetailedTimelinePageInfo;
  summary: DetailedTimelineCounts;
};

export type DetailedTimelineFilters = {
  since: string | null;
  until: string | null;
  opportunityId: string | null;
  dealId: string | null;
  contactId: string | null;
  companyId: string | null;
  actorUserId: string | null;
  lenderId: string | null;
  product: string | null;
  eventType: DetailedTimelineEventType | "all";
  sourceWorkspace: string | null;
  status: DetailedTimelineStatusFilter;
  search: string;
};

export type DetailedTimelineRestoreState = {
  filters: DetailedTimelineFilters;
  scrollY: number;
  expandedDays: string[];
  selectedEventId: string | null;
};

export type DetailedTimelineGraphContext = {
  opportunityId: string;
  opportunityNumber?: string | null;
  dealId?: string | null;
  dealNumber?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  customerLabel?: string | null;
  companyLabel?: string | null;
  lenderId?: string | null;
  lenderLabel?: string | null;
  productLabel?: string | null;
  loanAmount?: number | string | null;
  currentStage?: string | null;
  archived?: boolean;
  completed?: boolean;
  organizationId?: string | null;
  primaryOwnerUserId?: string | null;
  relationshipManagerUserId?: string | null;
  relationshipManagerName?: string | null;
  assignedUserIds?: string[] | null;
  hierarchyVisibilityUserIds?: string[] | null;
};

export type DetailedTimelineActor = {
  userId?: string | null;
  role?: string | null;
  organizationId?: string | null;
  displayName?: string | null;
};
