/**
 * CF-CHANAKYA-008 — UGJ lifecycle & journey catalogue.
 */

import type {
  UgjJourneyCode,
  UgjJourneyDefinition,
  UgjStepDefinition,
} from "@/types/universal-guided-journey";
import { ROUTES } from "@/constants/routes";

export const UGJ_FRAMEWORK_VERSION = "1.0.0-cf-chanakya-008";

export const UGJ_ENTERPRISE_PRINCIPLE =
  "Users should learn one interaction pattern and experience it consistently across Catalyst One. The journey begins with a conversation. The workspace begins after the conversation.";

export const UGJ_JOURNEY_CODES = {
  CONTACT_CREATION: "contact_creation",
  LOAN_JOURNEY: "loan_journey",
  INVESTMENT_JOURNEY: "investment_journey",
  INSURANCE_JOURNEY: "insurance_journey",
  EMPLOYEE_ONBOARDING: "employee_onboarding",
  PARTNER_ONBOARDING: "partner_onboarding",
  BUILDER: "builder",
  BANKER: "banker",
  CA: "ca",
  WEALTH_PARTNER: "wealth_partner",
} as const satisfies Record<string, UgjJourneyCode>;

/** Shared conversational contract — every UGJ step inherits these behaviours. */
export const UGJ_INTERACTION_CONTRACT = [
  "One question at a time",
  "CHANAKYA Guidance Card",
  "Personalized greeting",
  "Short conversational messages",
  "Progress indicator",
  "Explain why information is required",
  "One action per step",
  "Auto-save after every step where applicable",
  "On completion, automatically transition into the full workspace",
] as const;

function contactSteps(): UgjStepDefinition[] {
  return [
    {
      id: "name",
      label: "Name",
      question: "What is the contact's full name?",
      whyRequired: "A clear name lets CHANAKYA personalize the workspace and avoid duplicate records.",
      guidanceHint: "Share the name you use in day-to-day conversations.",
      fieldKind: "text",
      primaryActionLabel: "Continue",
      autoSave: true,
    },
    {
      id: "mobile",
      label: "Mobile",
      question: "What is the primary mobile number?",
      whyRequired: "Primary mobile is the unique contact key used across journeys and communications.",
      fieldKind: "tel",
      primaryActionLabel: "Continue",
      autoSave: true,
    },
    {
      id: "employment",
      label: "Employment",
      question: "What is their employment type?",
      whyRequired: "Employment type drives borrower relevance rules and document expectations later.",
      fieldKind: "single_select",
      primaryActionLabel: "Continue",
      autoSave: true,
    },
    {
      id: "email",
      label: "Email",
      question: "What is their email address?",
      whyRequired: "Email enables formal follow-ups; you may skip if unavailable right now.",
      fieldKind: "email",
      optional: true,
      primaryActionLabel: "Continue",
      secondaryActionLabel: "Skip",
      autoSave: true,
    },
    {
      id: "roles",
      label: "Roles",
      question: "Which roles apply to this contact?",
      whyRequired: "Roles open the right business journeys — Borrower, Investor, Partner, and more.",
      fieldKind: "multi_select",
      primaryActionLabel: "Continue",
      autoSave: true,
    },
    {
      id: "create",
      label: "Create",
      question: "Ready to create this contact?",
      whyRequired: "Confirm the conversation answers, then enter Contact Workspace without re-entry.",
      fieldKind: "summary",
      primaryActionLabel: "Create Contact",
      autoSave: false,
    },
  ];
}

/** Placeholder conversational scaffold for future journeys (architecture registered). */
function scaffoldSteps(topic: string, workspaceLabel: string): UgjStepDefinition[] {
  return [
    {
      id: "intent",
      label: "Intent",
      question: `Shall we begin the ${topic}?`,
      whyRequired: `Confirms you want to open this guided path before collecting details.`,
      fieldKind: "text",
      primaryActionLabel: "Begin",
      autoSave: true,
    },
    {
      id: "identity",
      label: "Identity",
      question: "Who is this journey for?",
      whyRequired: "Links the conversation to the right contact or party in Catalyst One.",
      fieldKind: "text",
      primaryActionLabel: "Continue",
      autoSave: true,
    },
    {
      id: "essentials",
      label: "Essentials",
      question: "What essential details should we capture first?",
      whyRequired: "Minimum information so the workspace opens ready for execution.",
      fieldKind: "text",
      primaryActionLabel: "Continue",
      autoSave: true,
    },
    {
      id: "confirm",
      label: "Confirm",
      question: `Ready to enter ${workspaceLabel}?`,
      whyRequired: "Completes the conversation and transitions into the full workspace.",
      fieldKind: "summary",
      primaryActionLabel: `Open ${workspaceLabel}`,
      autoSave: false,
    },
  ];
}

/**
 * UGJ catalogue — Contact Creation is the live reference.
 * Remaining journeys are registered to freeze the universal pattern.
 */
export const UGJ_JOURNEY_CATALOGUE: readonly UgjJourneyDefinition[] = [
  {
    id: "ugj-contact-creation",
    journeyCode: "contact_creation",
    name: "Contact Creation",
    description: "Quick Contact Creation — live reference for Universal Guided Journey.",
    eyebrow: "Quick Contact Creation",
    tagline: "One question at a time. Then continue into Contact Workspace.",
    status: "reference",
    enabled: true,
    sortOrder: 1,
    workspaceTarget: ROUTES.CONTACTS,
    workspaceTargetLabel: "Contact Workspace",
    supportsAutoSave: true,
    steps: contactSteps(),
    consumerHints: ["contacts", "ecm", "quick-create"],
  },
  {
    id: "ugj-loan",
    journeyCode: "loan_journey",
    name: "Loan Journey",
    description: "Conversational entry before Loan Workspace / pipeline execution.",
    eyebrow: "Loan Journey",
    tagline: "Begin with a conversation. Execute in Loan Workspace.",
    status: "registered",
    enabled: true,
    sortOrder: 2,
    workspaceTarget: ROUTES.LOAN_FILES,
    workspaceTargetLabel: "Loan Workspace",
    supportsAutoSave: true,
    steps: scaffoldSteps("Loan Journey", "Loan Workspace"),
    consumerHints: ["loan-files", "pipeline"],
  },
  {
    id: "ugj-investment",
    journeyCode: "investment_journey",
    name: "Investment Journey",
    description: "Investor journey conversational entry.",
    eyebrow: "Investment Journey",
    tagline: "One pattern for every wealth conversation.",
    status: "registered",
    enabled: true,
    sortOrder: 3,
    workspaceTarget: ROUTES.OPPORTUNITY_WORKSPACE,
    workspaceTargetLabel: "Investment Workspace",
    supportsAutoSave: true,
    steps: scaffoldSteps("Investment Journey", "Investment Workspace"),
    consumerHints: ["investor", "opportunity"],
  },
  {
    id: "ugj-insurance",
    journeyCode: "insurance_journey",
    name: "Insurance Journey",
    description: "Insurance journey conversational entry.",
    eyebrow: "Insurance Journey",
    tagline: "Guide protection needs before the workspace.",
    status: "registered",
    enabled: true,
    sortOrder: 4,
    workspaceTarget: ROUTES.OPPORTUNITY_WORKSPACE,
    workspaceTargetLabel: "Insurance Workspace",
    supportsAutoSave: true,
    steps: scaffoldSteps("Insurance Journey", "Insurance Workspace"),
    consumerHints: ["insurance", "opportunity"],
  },
  {
    id: "ugj-employee",
    journeyCode: "employee_onboarding",
    name: "Employee Onboarding",
    description: "Internal employee onboarding conversational entry.",
    eyebrow: "Employee Onboarding",
    tagline: "Onboard people the same way you create contacts.",
    status: "registered",
    enabled: true,
    sortOrder: 5,
    workspaceTarget: ROUTES.CONTACTS,
    workspaceTargetLabel: "Employee Workspace",
    supportsAutoSave: true,
    steps: scaffoldSteps("Employee Onboarding", "Employee Workspace"),
    consumerHints: ["ecm", "employee"],
  },
  {
    id: "ugj-partner",
    journeyCode: "partner_onboarding",
    name: "Partner Onboarding",
    description: "Channel partner onboarding conversational entry.",
    eyebrow: "Partner Onboarding",
    tagline: "Partner conversations first — workspace second.",
    status: "registered",
    enabled: true,
    sortOrder: 6,
    workspaceTarget: ROUTES.CONTACTS,
    workspaceTargetLabel: "Partner Workspace",
    supportsAutoSave: true,
    steps: scaffoldSteps("Partner Onboarding", "Partner Workspace"),
    consumerHints: ["ecm", "partner"],
  },
  {
    id: "ugj-builder",
    journeyCode: "builder",
    name: "Builder",
    description: "Builder / developer relationship guided entry.",
    eyebrow: "Builder Journey",
    tagline: "Capture builder essentials conversationally.",
    status: "registered",
    enabled: true,
    sortOrder: 7,
    workspaceTarget: ROUTES.CONTACTS,
    workspaceTargetLabel: "Builder Workspace",
    supportsAutoSave: true,
    steps: scaffoldSteps("Builder Journey", "Builder Workspace"),
    consumerHints: ["ecm", "builder"],
  },
  {
    id: "ugj-banker",
    journeyCode: "banker",
    name: "Banker",
    description: "Lender employee (Banker) guided entry.",
    eyebrow: "Banker Journey",
    tagline: "Know the banker before the lender pipeline work.",
    status: "registered",
    enabled: true,
    sortOrder: 8,
    workspaceTarget: ROUTES.CONTACTS,
    workspaceTargetLabel: "Banker Workspace",
    supportsAutoSave: true,
    steps: scaffoldSteps("Banker Journey", "Banker Workspace"),
    consumerHints: ["ecm", "lender_employee"],
  },
  {
    id: "ugj-ca",
    journeyCode: "ca",
    name: "CA",
    description: "Chartered accountant guided entry.",
    eyebrow: "CA Journey",
    tagline: "Professional CA context before workspace depth.",
    status: "registered",
    enabled: true,
    sortOrder: 9,
    workspaceTarget: ROUTES.CONTACTS,
    workspaceTargetLabel: "CA Workspace",
    supportsAutoSave: true,
    steps: scaffoldSteps("CA Journey", "CA Workspace"),
    consumerHints: ["ecm", "chartered_accountant"],
  },
  {
    id: "ugj-wealth",
    journeyCode: "wealth_partner",
    name: "Wealth Partner",
    description: "Wealth partner guided entry.",
    eyebrow: "Wealth Partner Journey",
    tagline: "Same conversational entry for wealth partnerships.",
    status: "registered",
    enabled: true,
    sortOrder: 10,
    workspaceTarget: ROUTES.CONTACTS,
    workspaceTargetLabel: "Wealth Partner Workspace",
    supportsAutoSave: true,
    steps: scaffoldSteps("Wealth Partner Journey", "Wealth Partner Workspace"),
    consumerHints: ["ecm", "partner", "investor"],
  },
] as const;

export function getEnabledUgjJourneys(): UgjJourneyDefinition[] {
  return UGJ_JOURNEY_CATALOGUE.filter((j) => j.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getUgjJourneyDefinition(
  code: UgjJourneyCode,
): UgjJourneyDefinition | undefined {
  return UGJ_JOURNEY_CATALOGUE.find((j) => j.journeyCode === code);
}

export function getUgjReferenceJourney(): UgjJourneyDefinition {
  return getUgjJourneyDefinition("contact_creation") ?? UGJ_JOURNEY_CATALOGUE[0]!;
}
