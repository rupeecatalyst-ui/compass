import type {
  ChanakyaChatGptContract,
  ChanakyaForbiddenInformationLabel,
  ChanakyaPhase5Role,
  ChanakyaStatedInformationDomain,
} from "@/types/chanakya-phase5-intelligence";

export const CP5_ARCHITECTURE_ROLES: Array<{
  role: ChanakyaPhase5Role;
  owner: string;
  responsibility: string;
}> = [
  {
    role: "enterprise_brain",
    owner: "Catalyst One",
    responsibility:
      "Owns calculations, workflows, policies, stages, eligibility, commissions, and all enterprise data truth.",
  },
  {
    role: "chief_of_staff",
    owner: "CHANAKYA",
    responsibility:
      "Observes the business day, prepares reflection packages, presents morning briefings, creates operational tasks, and guides proposal readiness.",
  },
  {
    role: "reasoning_partner",
    owner: "ChatGPT",
    responsibility:
      "Overnight reasoning, storytelling, coaching, prioritisation, executive briefing, and proposal drafting only — never business calculations or outbound email.",
  },
];

export const CP5_CHATGPT_CONTRACT: ChanakyaChatGptContract = {
  role: "reasoning_partner",
  isSourceOfBusinessTruth: false,
  forbiddenOperations: [
    "calculate_foir",
    "calculate_dbr",
    "calculate_commissions",
    "calculate_profitability",
    "determine_eligibility",
    "modify_workflow",
    "modify_stages",
    "update_enterprise_data",
    "send_email",
  ],
  allowedOperations: [
    "reasoning",
    "storytelling",
    "coaching",
    "prioritisation",
    "executive_briefing",
    "proposal_drafting",
    "business_communication",
  ],
  note: "No ChatGPT calls during normal business operations. Reflection packages contain structured business context only — never raw database dumps.",
};

export const CP5_STATED_INFORMATION_DOMAINS: Array<{
  id: ChanakyaStatedInformationDomain;
  label: string;
}> = [
  { id: "stated_financial_information", label: "Stated Financial Information" },
  { id: "stated_business_information", label: "Stated Business Information" },
  { id: "stated_property_information", label: "Stated Property Information" },
  { id: "stated_income_information", label: "Stated Income Information" },
];

export const CP5_FORBIDDEN_INFORMATION_LABELS: ChanakyaForbiddenInformationLabel[] = [
  "verified_information",
  "user_provided_information",
  "declared_information",
];

export const CP5_CAPABILITIES = [
  "Daily Enterprise Memory (observe only — no ChatGPT in daytime)",
  "Nightly Reflection Package (default 21:00 local)",
  "Morning Briefing with direct navigation",
  "Enterprise Narrative Engine (fact-based)",
  "Action Intelligence (auto-create ETE tasks)",
  "Feedback Loop into next-day reflection",
  "Enterprise Learning foundation (explainable; threshold-gated)",
  "Proposal Intelligence (MAKE PROPOSAL only)",
  "Proposal Readiness conversational review (completeness, not verification)",
] as const;

export const CP5_NON_NEGOTIABLES = [
  "Do not modify existing workflows, UI, calculations, authentication, or business logic.",
  "ChatGPT never calculates FOIR, DBR, commissions, profitability, or eligibility.",
  "ChatGPT never modifies workflow, stages, or enterprise data.",
  "ChatGPT never sends email — Catalyst One owns outbound communication.",
  "Proposal button text is MAKE PROPOSAL — never SEND PROPOSAL.",
  "Use Stated * Information terminology — never Verified / User Provided / Declared.",
] as const;
