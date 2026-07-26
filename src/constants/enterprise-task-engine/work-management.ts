/**
 * CO-BIZ-001 — Enterprise Task & Work Management constants.
 */

import type {
  EteBusinessEvent,
  EteEntityKind,
  EteWorkType,
} from "@/types/enterprise-task-engine";

export const ETE_WORK_TYPES = {
  FOLLOW_UP: "Follow-up",
  CUSTOMER_CALL: "Customer Call",
  LENDER_CALL: "Lender Call",
  DOCUMENT_COLLECTION: "Document Collection",
  VERIFICATION: "Verification",
  APPROVAL: "Approval",
  INTERNAL_REVIEW: "Internal Review",
  COMPLIANCE: "Compliance",
  ACCOUNTING: "Accounting",
  REMINDER: "Reminder",
  CUSTOM: "Custom",
} as const satisfies Record<string, EteWorkType>;

export const ETE_WORK_TYPE_LIST = Object.values(ETE_WORK_TYPES);

export const ETE_ENTITY_KINDS = {
  CUSTOMER: "Customer",
  OPPORTUNITY: "Opportunity",
  ENTERPRISE_DEAL: "EnterpriseDeal",
  DOCUMENT: "Document",
  LENDER: "Lender",
  WORKFLOW: "Workflow",
} as const satisfies Record<string, EteEntityKind>;

export const ETE_ENTITY_KIND_LIST = Object.values(ETE_ENTITY_KINDS);

export const ETE_TASK_STATUSES = {
  OPEN: "open",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const ETE_BUSINESS_EVENTS = {
  CUSTOMER_CREATED: "customer_created",
  OPPORTUNITY_CREATED: "opportunity_created",
  DEAL_CREATED: "deal_created",
  DEAL_LOGIN: "deal_login",
  SOFT_APPROVAL: "soft_approval",
  FINAL_APPROVAL: "final_approval",
  DISBURSED: "disbursed",
  DOCUMENT_UPLOADED: "document_uploaded",
  LENDER_ASSIGNED: "lender_assigned",
} as const satisfies Record<string, EteBusinessEvent>;

/** Map legacy predefined descriptions → work types. */
export const ETE_PREDEFINED_TO_WORK_TYPE: Record<string, EteWorkType> = {
  "Call Customer": "Customer Call",
  "Follow-up Documents": "Document Collection",
  "Verify CIBIL": "Verification",
  "Follow-up Lender": "Lender Call",
  "Resolve Query": "Follow-up",
  "Follow-up Manager": "Follow-up",
  "Internal Review": "Internal Review",
  "Customer Meeting": "Customer Call",
  "Branch Visit": "Follow-up",
  General: "Reminder",
  Custom: "Custom",
};

export type EteAutoGenerationRule = {
  id: string;
  event: EteBusinessEvent;
  workType: EteWorkType;
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  /** Days from event to due date */
  dueInDays: number;
  predefinedDescription:
    | "Call Customer"
    | "Follow-up Documents"
    | "Verify CIBIL"
    | "Follow-up Lender"
    | "Resolve Query"
    | "Follow-up Manager"
    | "Internal Review"
    | "Customer Meeting"
    | "Branch Visit"
    | "General"
    | "Custom";
};

export const ETE_AUTO_GENERATION_RULES: readonly EteAutoGenerationRule[] = [
  {
    id: "welcome-call",
    event: "customer_created",
    workType: "Customer Call",
    title: "Welcome Call",
    description: "Complete welcome call with the new customer.",
    priority: "high",
    dueInDays: 1,
    predefinedDescription: "Call Customer",
  },
  {
    id: "collect-documents",
    event: "opportunity_created",
    workType: "Document Collection",
    title: "Collect Documents",
    description: "Collect mandatory documents for the new opportunity.",
    priority: "high",
    dueInDays: 2,
    predefinedDescription: "Follow-up Documents",
  },
  {
    id: "lender-login-follow-up",
    event: "deal_login",
    workType: "Lender Call",
    title: "Follow up with lender",
    description: "Follow up with lender after Login stage entry.",
    priority: "high",
    dueInDays: 1,
    predefinedDescription: "Follow-up Lender",
  },
  {
    id: "sanction-documents",
    event: "soft_approval",
    workType: "Document Collection",
    title: "Collect sanction documents",
    description: "Collect sanction / soft-approval documents.",
    priority: "critical",
    dueInDays: 2,
    predefinedDescription: "Follow-up Documents",
  },
  {
    id: "invoice-reminder",
    event: "disbursed",
    workType: "Accounting",
    title: "Invoice generation reminder",
    description: "Generate invoice after disbursement.",
    priority: "high",
    dueInDays: 1,
    predefinedDescription: "General",
  },
  {
    id: "deal-created-kickoff",
    event: "deal_created",
    workType: "Follow-up",
    title: "Deal kickoff checklist",
    description: "Confirm parties, product, and next workflow step for the new Deal.",
    priority: "medium",
    dueInDays: 1,
    predefinedDescription: "Internal Review",
  },
];
