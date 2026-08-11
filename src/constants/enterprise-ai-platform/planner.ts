/**
 * Planner & Next Best Action constants (CO-AI-107 / Sprint AI-7).
 */

import type { EaiPlannerInfoSlotId } from "@/types/enterprise-ai-planner";

export const EAI_PLANNER_VERSION = "1.0.0-ai7";

export const EAI_PLANNER_DISCLAIMERS = [
  "The Planner identifies gaps and next steps — it does not execute CRM or workflow actions.",
  "Side effects require Action Proposals and human approval (SB-06).",
  "Ask only the minimum information still required; skip known facts.",
] as const;

/** Max clarifying questions selected per plan turn. */
export const EAI_PLANNER_MAX_QUESTIONS = 2;

/** Max next-best-action items sequenced per plan. */
export const EAI_PLANNER_MAX_ACTIONS = 3;

/** Curated information slots with priority (lower = ask sooner). */
export const EAI_PLANNER_INFO_SLOTS: readonly {
  slotId: EaiPlannerInfoSlotId;
  label: string;
  priority: number;
  /** Patterns that indicate the slot is already known */
  knownPatterns: RegExp[];
  /** Patterns that make the slot relevant */
  relevancePatterns: RegExp[];
  question: string;
}[] = [
  {
    slotId: "product_interest",
    label: "Product interest",
    priority: 10,
    knownPatterns: [
      /\bhome\s*loan\b/i,
      /\bLAP\b/,
      /\bbusiness\s*loan\b/i,
      /\bpersonal\s*loan\b/i,
      /\bbalance\s*transfer\b/i,
      /\bworking\s*capital\b/i,
      /\bproduct[_.]?interest\b/i,
    ],
    relevancePatterns: [/\bloan\b/i, /\bborrow\b/i, /\beligib/i, /\bEMI\b/i, /\badvise\b/i, /\brecommend\b/i],
    question: "Which loan product interests you?",
  },
  {
    slotId: "required_amount",
    label: "Required amount",
    priority: 20,
    knownPatterns: [
      /\brequired[_.]?amount\b/i,
      /\bamount\s*(is|=|:)?\s*[\d,]+/i,
      /\b₹\s*[\d,]+/,
      /\bRs\.?\s*[\d,]+/i,
      /\b\d+\s*(lakh|crore|lac)\b/i,
    ],
    relevancePatterns: [/\bloan\b/i, /\bEMI\b/i, /\bafford\b/i, /\beligib/i, /\bamount\b/i],
    question: "What amount are you looking for?",
  },
  {
    slotId: "employment_or_income",
    label: "Employment or income",
    priority: 30,
    knownPatterns: [
      /\bsalaried\b/i,
      /\bself[\s-]?employed\b/i,
      /\bincome\b/i,
      /\bemployment\b/i,
      /\bmonthly\s*salary\b/i,
    ],
    relevancePatterns: [/\beligib/i, /\bEMI\b/i, /\bafford\b/i, /\bFOIR\b/i, /\bqualify\b/i],
    question: "Are you salaried or self-employed?",
  },
  {
    slotId: "city_or_location",
    label: "City or location",
    priority: 40,
    knownPatterns: [/\bcity\b/i, /\blocation\b/i, /\bin\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/],
    relevancePatterns: [/\blender\b/i, /\bbranch\b/i, /\bproperty\b/i, /\bhome\s*loan\b/i],
    question: "Which city is this for?",
  },
  {
    slotId: "existing_emi",
    label: "Existing EMI",
    priority: 25,
    knownPatterns: [/\bexisting[_.]?emi\b/i, /\bcurrent\s*emi\b/i, /\bEMI\s*(is|=|:)?\s*[\d,]+/i],
    relevancePatterns: [/\bbalance\s*transfer\b/i, /\bBT\b/, /\breduce\s+my\s+emi\b/i, /\btop[\s-]?up\b/i],
    question: "What is your current EMI?",
  },
  {
    slotId: "outstanding_loan",
    label: "Outstanding loan",
    priority: 26,
    knownPatterns: [
      /\boutstanding\b/i,
      /\bprincipal\s*(left|remaining)\b/i,
      /\boutstanding[_.]?loan\b/i,
    ],
    relevancePatterns: [/\bbalance\s*transfer\b/i, /\bBT\b/, /\btop[\s-]?up\b/i],
    question: "What is the outstanding loan amount?",
  },
  {
    slotId: "document_readiness",
    label: "Document readiness",
    priority: 50,
    knownPatterns: [
      /\bdocuments?\s*(ready|uploaded|submitted|complete)\b/i,
      /\bKYC\s*(done|complete|verified)\b/i,
      /\bdocument[_.]?readiness\b/i,
    ],
    relevancePatterns: [/\bdocument\b/i, /\bKYC\b/i, /\bupload\b/i, /\bpaper\b/i],
    question: "Do you have KYC documents ready?",
  },
  {
    slotId: "callback_preference",
    label: "Callback preference",
    priority: 60,
    knownPatterns: [/\bcallback\b/i, /\bcall\s+me\b/i, /\bprefer.*morning|evening|afternoon\b/i],
    relevancePatterns: [/\bcallback\b/i, /\bcall\s+me\b/i, /\bspeak\s+to\b/i, /\bfollow[\s-]?up\b/i],
    question: "When should we call you back?",
  },
] as const;

/** Proposal kinds the Planner may emit as drafts. */
export const EAI_PLANNER_ALLOWED_PROPOSAL_KINDS = [
  "request_documents",
  "schedule_callback",
  "create_task",
  "create_reminder",
  "generic",
] as const;

/** Forbidden execution verbs in planner summaries. */
export const EAI_PLANNER_FORBIDDEN_EXECUTION_CLAIMS = [
  "created lead",
  "created opportunity",
  "email sent",
  "workflow executed",
  "crm updated",
  "opportunity created",
  "lead created",
] as const;
