/**
 * Domain Boundary & Knowledge Governance constants (CO-AI-104A / Sprint AI-4A).
 */

import type {
  EaiKnowledgeTopicDef,
  EaiKnowledgeZoneId,
} from "@/types/enterprise-ai-domain-governance";

export const EAI_DOMAIN_GOVERNANCE_VERSION = "1.1.0-ai4-die";

export const EAI_KNOWLEDGE_ZONE_LABELS: Record<EaiKnowledgeZoneId, string> = {
  zone_1_core: "Core Domain",
  zone_2_adjacent: "Adjacent Domain",
  zone_3_outside: "Outside Domain",
};

/**
 * Outside / unknown domain — fixed platform response (CO-AI-104 DIE).
 * Identical across every Behaviour Pack. Not an LLM prompt.
 */
export const EAI_OUTSIDE_DOMAIN_REFUSAL = "I'm not trained for this subject.";

/** @deprecated Use EAI_OUTSIDE_DOMAIN_REFUSAL for outside-domain. Kept for legacy imports. */
export const EAI_DEFAULT_SAFE_REFUSAL = EAI_OUTSIDE_DOMAIN_REFUSAL;

export const EAI_DOMAIN_REDIRECT_HINTS = [
  "Home loans and Balance Transfer",
  "EMI, eligibility, FOIR and documentation",
  "Rupee Catalyst / Catalyst One lending products",
  "Comparing lender options for a borrowing decision",
] as const;

export const EAI_TONE_LIBRARY_VERSION = "1.0.0-ai4-die";

export const EAI_MICRO_COMMUNICATION_VERSION = "1.0.0-ai4-die";

/**
 * Knowledge Zone topic catalogue — platform SSOT for domain membership.
 * Matching is deterministic (regex); the LLM never owns this decision.
 */
export const EAI_KNOWLEDGE_TOPICS: readonly EaiKnowledgeTopicDef[] = [
  // —— Zone 1 Core ——
  {
    topicId: "home_loan",
    label: "Home Loan",
    zone: "zone_1_core",
    patterns: [/\bhome\s*loan\b/i, /\bhousing\s*loan\b/i, /\bmortgage\s*loan\b/i],
  },
  {
    topicId: "balance_transfer",
    label: "Balance Transfer",
    zone: "zone_1_core",
    patterns: [/\bbalance\s*transfer\b/i, /\bbt\s*loan\b/i],
  },
  {
    topicId: "top_up",
    label: "Top-up",
    zone: "zone_1_core",
    patterns: [/\btop[\s-]?up\b/i],
  },
  {
    topicId: "lap",
    label: "LAP",
    zone: "zone_1_core",
    patterns: [/\bLAP\b/, /\bloan\s+against\s+property\b/i],
  },
  {
    topicId: "business_loan",
    label: "Business Loan",
    zone: "zone_1_core",
    patterns: [/\bbusiness\s*loan\b/i, /\bSME\s*loan\b/i, /\bMSME\s*loan\b/i],
  },
  {
    topicId: "working_capital",
    label: "Working Capital",
    zone: "zone_1_core",
    patterns: [/\bworking\s*capital\b/i, /\bcash\s*credit\b/i, /\boverdraft\b/i],
  },
  {
    topicId: "construction_finance",
    label: "Construction Finance",
    zone: "zone_1_core",
    patterns: [/\bconstruction\s*finance\b/i, /\bproject\s*finance\b/i],
  },
  {
    topicId: "personal_loan",
    label: "Personal Loan",
    zone: "zone_1_core",
    patterns: [/\bpersonal\s*loan\b/i],
  },
  {
    topicId: "credit",
    label: "Credit",
    zone: "zone_1_core",
    patterns: [/\bcredit\s*(score|report|profile|assessment)?\b/i, /\bunderwriting\b/i],
  },
  {
    topicId: "cibil",
    label: "CIBIL",
    zone: "zone_1_core",
    patterns: [/\bCIBIL\b/i, /\bcredit\s*bureau\b/i, /\bCRIF\b/i, /\bExperian\b/i],
  },
  {
    topicId: "foir",
    label: "FOIR",
    zone: "zone_1_core",
    patterns: [/\bFOIR\b/i, /\bfixed\s*obligation\b/i],
  },
  {
    topicId: "dbr",
    label: "DBR",
    zone: "zone_1_core",
    patterns: [/\bDBR\b/i, /\bdebt[\s-]*burden\b/i],
  },
  {
    topicId: "emi",
    label: "EMI",
    zone: "zone_1_core",
    patterns: [/\bEMI\b/i, /\bequi(?:ated|valent)?\s*monthly\s*instal?lment\b/i, /\breduce\s+my\s+emi\b/i],
  },
  {
    topicId: "loan_documentation",
    label: "Loan documentation",
    zone: "zone_1_core",
    patterns: [
      /\bloan\s*document/i,
      /\bKYC\b/i,
      /\bLOD\b/i,
      /\bsalary\s*slip/i,
      /\bbank\s*statement/i,
    ],
  },
  {
    topicId: "loan_eligibility",
    label: "Loan eligibility",
    zone: "zone_1_core",
    patterns: [/\beligib(?:le|ility)\b/i, /\bqualify\s+for\s+(a\s+)?loan\b/i],
  },
  {
    topicId: "lender_comparison",
    label: "Lender comparison",
    zone: "zone_1_core",
    patterns: [/\blender\b/i, /\bbank\s+vs\b/i, /\bcompare\s+(lenders|banks|NBFC)/i, /\bNBFC\b/i],
  },
  {
    topicId: "loan_process",
    label: "Loan Process",
    zone: "zone_1_core",
    patterns: [
      /\bloan\s*process\b/i,
      /\bloan\s*journey\b/i,
      /\bapplication\s*process\b/i,
      /\bcreate\s+lead\b/i,
      /\bstart\s+(a\s+)?loan\b/i,
    ],
  },
  {
    topicId: "loan_products",
    label: "Loan Products",
    zone: "zone_1_core",
    patterns: [/\bloan\s*products?\b/i, /\bproduct\s*catalogue\b/i],
  },
  {
    topicId: "credit_score",
    label: "Credit Score",
    zone: "zone_1_core",
    patterns: [/\bcredit\s*score\b/i],
  },
  {
    topicId: "rupee_catalyst_services",
    label: "Rupee Catalyst Services",
    zone: "zone_1_core",
    patterns: [
      /\brupee\s*catalyst\s*services?\b/i,
      /\bcatalyst\s*one\s*services?\b/i,
    ],
  },
  {
    topicId: "rupee_catalyst_products",
    label: "Rupee Catalyst products",
    zone: "zone_1_core",
    patterns: [
      /\brupee\s*catalyst\b/i,
      /\bcatalyst\s*one\b/i,
      /\bSARATHI\b/i,
      /\bCOMPASS\b/i,
    ],
  },
  {
    topicId: "loan_generic",
    label: "Lending / loan journey",
    zone: "zone_1_core",
    patterns: [
      /\bloan\b/i,
      /\blending\b/i,
      /\bdisburs/i,
      /\bmortgage\b/i,
      /\binterest\s*rate\b/i,
      /\bprepayment\b/i,
      /\bforeclos/i,
    ],
  },
  // —— Zone 2 Adjacent (answer only if useful to borrowing) ——
  {
    topicId: "banking",
    label: "Banking",
    zone: "zone_2_adjacent",
    patterns: [/\bbanking\b/i, /\bsavings\s*account\b/i, /\bcurrent\s*account\b/i],
  },
  {
    topicId: "property_purchase",
    label: "Property purchase",
    zone: "zone_2_adjacent",
    patterns: [/\bproperty\s*purchase\b/i, /\bbuy(?:ing)?\s+(a\s+)?(?:home|flat|house|property)\b/i],
  },
  {
    topicId: "registration",
    label: "Registration",
    zone: "zone_2_adjacent",
    patterns: [/\bproperty\s*registration\b/i, /\bsale\s*deed\b/i, /\bregistration\s*of\s*(property|flat)\b/i],
  },
  {
    topicId: "stamp_duty",
    label: "Stamp Duty",
    zone: "zone_2_adjacent",
    patterns: [/\bstamp\s*duty\b/i],
  },
  {
    topicId: "home_loan_insurance",
    label: "Home Loan insurance",
    zone: "zone_2_adjacent",
    patterns: [/\bhome\s*loan\s*insurance\b/i, /\bmortgage\s*insurance\b/i, /\bloan\s*protection\b/i],
  },
  {
    topicId: "mortgage_process",
    label: "Mortgage process",
    zone: "zone_2_adjacent",
    patterns: [/\bmortgage\s*process\b/i, /\bclosing\s*costs?\b/i],
  },
  {
    topicId: "rbi_lending",
    label: "General RBI lending guidance",
    zone: "zone_2_adjacent",
    patterns: [/\bRBI\b/i, /\breserve\s*bank\b/i],
  },
  // —— Zone 3 Outside ——
  {
    topicId: "politics",
    label: "Politics",
    zone: "zone_3_outside",
    patterns: [/\bpolitic/i, /\belection\b/i, /\bprime\s*minister\b/i, /\bparliament\b/i],
  },
  {
    topicId: "sports",
    label: "Sports",
    zone: "zone_3_outside",
    patterns: [/\bcricket\b/i, /\bfootball\b/i, /\bIPL\b/i, /\bolympic/i, /\bsports?\b/i],
  },
  {
    topicId: "entertainment",
    label: "Entertainment",
    zone: "zone_3_outside",
    patterns: [/\bmovie\b/i, /\bbollywood\b/i, /\bnetflix\b/i, /\bcelebrity\b/i, /\bsong\s*lyrics\b/i],
  },
  {
    topicId: "programming",
    label: "Programming",
    zone: "zone_3_outside",
    patterns: [
      /\bjavascript\b/i,
      /\bpython\b/i,
      /\btypescript\b/i,
      /\bcoding\b/i,
      /\bprogramming\b/i,
      /\bwrite\s+(me\s+)?(a\s+)?(react|sql|code)\b/i,
    ],
  },
  {
    topicId: "recipes",
    label: "Recipes",
    zone: "zone_3_outside",
    patterns: [/\brecipe\b/i, /\bcook(?:ing)?\b/i, /\bingredients?\b/i],
  },
  {
    topicId: "travel",
    label: "Travel",
    zone: "zone_3_outside",
    patterns: [/\btravel\b/i, /\bvacation\b/i, /\bflight\s*ticket\b/i, /\bitinerary\b/i, /\btourism\b/i],
  },
  {
    topicId: "medical",
    label: "Medical",
    zone: "zone_3_outside",
    patterns: [/\bdiagnos/i, /\bsymptom\b/i, /\bmedicine\b/i, /\bdoctor\b/i, /\bcovid\b/i, /\btreatment\b/i],
  },
  {
    topicId: "general_legal",
    label: "General legal advice",
    zone: "zone_3_outside",
    patterns: [/\bdivorce\b/i, /\bcriminal\s*law\b/i, /\bsue\s+(someone|them)\b/i, /\bwills?\s+and\s+probate\b/i],
  },
  {
    topicId: "personal_chat",
    label: "Personal conversations",
    zone: "zone_3_outside",
    patterns: [
      /\bhow\s+are\s+you\b/i,
      /\btell\s+me\s+a\s+joke\b/i,
      /\bbe\s+my\s+friend\b/i,
      /\bdating\b/i,
      /\blove\s+advice\b/i,
    ],
  },
  {
    topicId: "general_chatgpt",
    label: "General ChatGPT usage",
    zone: "zone_3_outside",
    patterns: [
      /\bact\s+as\b/i,
      /\bignore\s+(all\s+)?(previous|prior)\s+instructions\b/i,
      /\bgeneral\s+knowledge\s+quiz\b/i,
      /\bwrite\s+(an?\s+)?essay\b/i,
      /\bhomework\b/i,
    ],
  },
];

/** Seed knowledge sources — every future source must declare a Knowledge Zone. */
export const EAI_DEFAULT_KNOWLEDGE_SOURCES: readonly {
  sourceId: string;
  displayName: string;
  zone: EaiKnowledgeZoneId;
  description: string;
}[] = [
  {
    sourceId: "chanakya_guide_repository",
    displayName: "Chanakya Guide Repository",
    zone: "zone_1_core",
    description: "Enterprise Guide entries for loan journey workspaces",
  },
  {
    sourceId: "product_library_catalog",
    displayName: "Product Library Catalogue",
    zone: "zone_1_core",
    description: "Rupee Catalyst / Catalyst One product definitions",
  },
  {
    sourceId: "epde_policy_explanations",
    displayName: "EPDE Policy Explanations",
    zone: "zone_1_core",
    description: "Published policy explanation projections (not decisions)",
  },
  {
    sourceId: "rbi_lending_briefs",
    displayName: "RBI Lending Briefs (adjacent)",
    zone: "zone_2_adjacent",
    description: "General RBI lending guidance when useful to borrowing",
  },
];
