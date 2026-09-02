/**
 * CO-C1-CHANAKYA-REALTIME-INTELLIGENCE-001
 * Shared facing contracts for in-app CHANAKYA and Catalyst One GPT.
 */

export type ChanakyaConversationModelStatus =
  | "generated"
  | "unavailable"
  | "refused"
  | "context_missing";

export type ChanakyaConversationEvidenceLink = {
  label: string;
  href: string;
  opportunityRef: string | null;
  dealRef: string | null;
  stage: string | null;
  lastUpdated: string | null;
  freshness: string | null;
};

export type ChanakyaInterventionCard = {
  customerName: string | null;
  companyName: string | null;
  product: string | null;
  lender: string | null;
  opportunityRef: string | null;
  dealRef: string | null;
  opportunityId: string | null;
  dealId: string | null;
  stage: string | null;
  daysInStage: number | null;
  assignedRcEmployee: string | null;
  slaOrExpectedDate: string | null;
  pendingDocuments: number | null;
  pendingTasks: number | null;
  latestActivity: string | null;
  reason: string;
  recommendedNextAction: string;
  lastUpdated: string | null;
  freshness: string | null;
  href: string;
};

export type ChanakyaGroundingBrief = {
  askedAt: string;
  compiledAt: string | null;
  liveTrusted: boolean;
  freshnessLabel: string;
  intent: string;
  focus: {
    opportunityRef: string | null;
    dealRef: string | null;
  };
  interventionCards: ChanakyaInterventionCard[];
  similarCards: ChanakyaInterventionCard[];
  deskSummary: string | null;
  entityNotes: string[];
  emptyCriteria: string[] | null;
  changeSummary: string | null;
  creditSummary: string | null;
  lenderSummary: string | null;
  documentNotes: string[];
};

export type ChanakyaConversationModelPort = {
  generate(input: {
    systemPrompt: string;
    userPrompt: string;
    history: Array<{ role: "user" | "assistant"; text: string }>;
  }): Promise<string | null>;
};
