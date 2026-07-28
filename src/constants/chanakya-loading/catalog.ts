/**
 * CO-UX-008 — Static message catalogs (progress / tips / knowledge / status).
 * Live business insights are composed from EBI/ETE signals — never hardcoded counts here.
 */

import type { ChanakyaLoadingModule } from "@/types/chanakya-loading";

export const CHANAKYA_LOADING_PROGRESS: Record<
  ChanakyaLoadingModule,
  readonly string[]
> = {
  dashboard: [
    "Preparing Business Dashboard...",
    "Checking today's Opportunities...",
    "Preparing Executive KPIs...",
    "Reviewing today's logins...",
    "Preparing Dashboard...",
  ],
  "my-opportunities": [
    "Loading Opportunities...",
    "Preparing Opportunity Registry...",
    "Checking requirement stages...",
  ],
  opportunity: [
    "Loading Opportunities...",
    "Preparing Opportunity Workspace...",
    "Building Relationship Network...",
  ],
  "my-deals": [
    "Loading active Deals...",
    "Calculating Deal Health...",
    "Checking lender stages...",
    "Preparing Action Centre...",
  ],
  deal: [
    "Loading active Deals...",
    "Checking Lender Pipeline...",
    "Preparing Deal Workspace...",
  ],
  "loan-journey": [
    "Loading borrower journey...",
    "Preparing workflow...",
    "Reviewing document checklist...",
  ],
  contacts: [
    "Preparing Enterprise Contacts...",
    "Building Relationship Graph...",
    "Loading Company Structure...",
  ],
  "contact-strategy": [
    "Preparing Contact Strategy...",
    "Building Relationship Network...",
    "Loading Company Structure...",
  ],
  customers: [
    "Preparing Enterprise Contacts...",
    "Building Relationship Graph...",
  ],
  "mission-control": [
    "Preparing Mission Control...",
    "Preparing Executive Briefing...",
    "Reviewing enterprise health...",
    "Checking strategic risks...",
    "Preparing AI insights...",
  ],
  documents: [
    "Preparing Document Center...",
    "Reviewing document checklist...",
  ],
  credit: [
    "Preparing Credit Workspace...",
    "Reviewing credit readiness...",
  ],
  tasks: [
    "Loading Tasks...",
    "Checking overdue work...",
  ],
  lenders: [
    "Loading Lenders...",
    "Checking lender programs...",
  ],
  accounting: [
    "Preparing Accounting...",
    "Loading invoice parties...",
  ],
  reports: [
    "Preparing Reports...",
    "Reviewing Enterprise Metrics...",
  ],
  administration: [
    "Preparing Administration...",
    "Loading configuration...",
  ],
  settings: [
    "Preparing Settings...",
    "Loading preferences...",
  ],
  enterprise: [
    "Preparing your workspace...",
    "Reviewing Enterprise Metrics...",
    "Checking Lender Pipeline...",
  ],
};

export const CHANAKYA_LOADING_PRODUCTIVITY_TIPS = [
  "Follow up within 24 hours for better conversions.",
  "Update document status after customer interaction.",
  "Always capture Opportunity Source accurately.",
  "Complete overdue tasks before creating new Opportunities.",
  "Keep Loan Structure participants current before lender login.",
] as const;

export const CHANAKYA_LOADING_BUSINESS_KNOWLEDGE = [
  "Opportunity Value is counted only once irrespective of multiple lenders.",
  "Commercial Purchase is tracked independently from Loan Against Property.",
  "FOIR measures repayment capacity.",
  "Every Deal originates from a single Opportunity.",
  "Company Representatives are communication contacts — not automatic borrowers.",
] as const;

export const CHANAKYA_LOADING_ENTERPRISE_STATUS = [
  "Enterprise services operational.",
  "Dashboard metrics refresh from live enterprise data.",
  "No filler metrics — only system-derived observations.",
] as const;

export const CHANAKYA_LOADING_COMPLETION: Record<
  ChanakyaLoadingModule,
  readonly string[]
> = {
  dashboard: [
    "✓ Dashboard ready.",
    "Have a productive day.",
  ],
  "my-opportunities": ["✓ Opportunities ready.", "Have a productive day."],
  opportunity: ["✓ Workspace ready.", "Have a productive day."],
  "my-deals": ["✓ Deals ready.", "Have a productive day."],
  deal: ["✓ Deal Workspace ready.", "Have a productive day."],
  "loan-journey": ["✓ Loan Journey ready.", "Have a productive day."],
  contacts: ["✓ Contacts ready.", "Have a productive day."],
  "contact-strategy": ["✓ Contact Strategy ready.", "Have a productive day."],
  customers: ["✓ Customers ready.", "Have a productive day."],
  "mission-control": ["✓ Mission Control ready.", "Have a productive day."],
  documents: ["✓ Documents ready.", "Have a productive day."],
  credit: ["✓ Credit Workspace ready.", "Have a productive day."],
  tasks: ["✓ Tasks ready.", "Have a productive day."],
  lenders: ["✓ Lenders ready.", "Have a productive day."],
  accounting: ["✓ Accounting ready.", "Have a productive day."],
  reports: ["✓ Reports ready.", "Have a productive day."],
  administration: ["✓ Administration ready.", "Have a productive day."],
  settings: ["✓ Settings ready.", "Have a productive day."],
  enterprise: ["✓ Workspace ready.", "Have a productive day."],
};
