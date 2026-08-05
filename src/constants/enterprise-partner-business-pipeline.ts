/**
 * CO-WP-BUSINESS-001 — My Business Pipeline Workspace (Enterprise constants).
 * Catalyst One owns pipeline buckets · filters · empty states · copy.
 * Companion renders DTOs only — never invents buckets or recommendations.
 */

export const PARTNER_BUSINESS_PIPELINE_META = {
  title: "My Business",
  subtitle: "What business requires my attention today?",
  searchPlaceholder: "Search customer, opportunity, mobile, product…",
  opportunitiesSectionTitle: "My Opportunities",
  prioritiesSectionTitle: "Today's Priorities",
  recommendationsSectionTitle: "Next Best Actions",
  pipelineSectionTitle: "Business Pipeline",
  dtoNotice:
    "Business Pipeline is an Enterprise projection. Placeholder until Opportunity Registry / ETE / workflow engines cut over — companion must not invent stages or recommendations.",
} as const;

export const PARTNER_BUSINESS_PIPELINE_BUCKETS = [
  {
    id: "new_opportunities",
    label: "New Opportunities",
    tone: "green",
    emoji: "🟢",
    sortOrder: 10,
  },
  {
    id: "documents_pending",
    label: "Documents Pending",
    tone: "amber",
    emoji: "🟡",
    sortOrder: 20,
  },
  {
    id: "credit_review",
    label: "Credit Review",
    tone: "blue",
    emoji: "🔵",
    sortOrder: 30,
  },
  {
    id: "sent_to_lender",
    label: "Sent to Lender",
    tone: "purple",
    emoji: "🟣",
    sortOrder: 40,
  },
  {
    id: "sanction_received",
    label: "Sanction Received",
    tone: "orange",
    emoji: "🟠",
    sortOrder: 50,
  },
  {
    id: "ready_for_disbursement",
    label: "Ready for Disbursement",
    tone: "teal",
    emoji: "🟢",
    sortOrder: 60,
  },
  {
    id: "disbursed",
    label: "Disbursed",
    tone: "success",
    emoji: "✅",
    sortOrder: 70,
  },
  {
    id: "follow_up_required",
    label: "Follow-up Required",
    tone: "red",
    emoji: "🔴",
    sortOrder: 80,
  },
] as const;

export const PARTNER_BUSINESS_PIPELINE_FILTERS = [
  { id: "all", label: "All", kind: "scope", sortOrder: 0 },
  { id: "home_loan", label: "Home Loan", kind: "product", sortOrder: 10 },
  { id: "business_loan", label: "Business Loan", kind: "product", sortOrder: 20 },
  { id: "lap", label: "LAP", kind: "product", sortOrder: 30 },
  { id: "mutual_fund", label: "Mutual Fund", kind: "product", sortOrder: 40 },
  { id: "insurance", label: "Insurance", kind: "product", sortOrder: 50 },
  { id: "today", label: "Today", kind: "time", sortOrder: 60 },
  { id: "this_week", label: "This Week", kind: "time", sortOrder: 70 },
  { id: "overdue", label: "Overdue", kind: "priority", sortOrder: 80 },
  { id: "high_priority", label: "High Priority", kind: "priority", sortOrder: 90 },
] as const;

export const PARTNER_BUSINESS_PIPELINE_PRIORITY_KINDS = [
  { id: "calls", label: "Today's Calls", icon: "phone", sortOrder: 10 },
  { id: "meetings", label: "Today's Meetings", icon: "calendar", sortOrder: 20 },
  { id: "follow_ups", label: "Pending Follow-ups", icon: "reply", sortOrder: 30 },
  { id: "documents", label: "Pending Documents", icon: "upload", sortOrder: 40 },
  { id: "overdue_tasks", label: "Overdue Tasks", icon: "target", sortOrder: 50 },
] as const;

export const PARTNER_BUSINESS_PIPELINE_EMPTY_STATES = {
  opportunities: {
    id: "opportunities",
    title: "No Opportunities",
    message: "Start a Quick or Detailed Opportunity to fill your Business Pipeline.",
    ctaLabel: "Detailed Opportunity",
    ctaDeepLink: "/app/opportunities/new?mode=detailed",
  },
  follow_ups: {
    id: "follow_ups",
    title: "No Follow-ups",
    message: "You're clear on follow-ups for now. Check pipeline cards for new work.",
    ctaLabel: null,
    ctaDeepLink: null,
  },
  documents: {
    id: "documents",
    title: "No Pending Documents",
    message: "No document actions need attention on your open Opportunities.",
    ctaLabel: null,
    ctaDeepLink: null,
  },
  tasks: {
    id: "tasks",
    title: "No Tasks",
    message: "No overdue tasks in your Enterprise projection for today.",
    ctaLabel: null,
    ctaDeepLink: null,
  },
  priorities: {
    id: "priorities",
    title: "No Priorities Right Now",
    message: "When calls, meetings, or follow-ups land, they will appear here.",
    ctaLabel: "View Opportunities",
    ctaDeepLink: null,
  },
  recommendations: {
    id: "recommendations",
    title: "No Recommendations",
    message: "Enterprise will surface Next Best Actions as Opportunities progress.",
    ctaLabel: null,
    ctaDeepLink: null,
  },
  search: {
    id: "search",
    title: "No Matches",
    message: "Try another customer, opportunity number, mobile, product, or company.",
    ctaLabel: null,
    ctaDeepLink: null,
  },
} as const;

export const PARTNER_BUSINESS_PIPELINE_QUICK_ACTIONS = [
  {
    id: "quick_opportunity",
    label: "Quick Opportunity",
    deepLink: "/app/opportunities/new?mode=quick",
    sortOrder: 10,
  },
  {
    id: "detailed_opportunity",
    label: "Detailed Opportunity",
    deepLink: "/app/opportunities/new?mode=detailed",
    sortOrder: 20,
  },
  {
    id: "customers",
    label: "Customers",
    deepLink: "/app/customers",
    sortOrder: 30,
  },
] as const;
