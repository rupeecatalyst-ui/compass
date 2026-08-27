/**
 * CO-CHANAKYA-INTELLIGENCE-001 — Dashboard CHANAKYA Intelligence contracts.
 * Read-only projection layer. CHANAKYA must never mutate Catalyst One records.
 */

export type ChanakyaDashboardViewMode = "dashboard" | "intelligence";

export type ChanakyaIntelligenceAttentionKind =
  | "delayed_transaction"
  | "sla_pressure"
  | "pending_decision"
  | "document_gap"
  | "lender_follow_up"
  | "rm_follow_up"
  | "overdue_task"
  | "operational_exception";

export interface ChanakyaIntelligenceAttentionItem {
  id: string;
  kind: ChanakyaIntelligenceAttentionKind;
  title: string;
  /** WHAT happened / why it matters (from SSOT reason text). */
  whyItMatters: string;
  /** Ageing / pending signal when available from ETE; null when not exposed. */
  pendingLabel: string | null;
  /** Advisory next step — never an automatic mutation. */
  recommendation: string;
  href?: string;
  band: "critical" | "high" | "medium" | "low";
}

export type ChanakyaNearingMilestone =
  | "soft_approval"
  | "final_approval"
  | "closure"
  | "disbursement";

export interface ChanakyaNearingCompletionItem {
  id: string;
  title: string;
  product: string;
  lender: string;
  milestone: ChanakyaNearingMilestone;
  milestoneLabel: string;
  stageLabel: string;
  amountLabel: string;
  /** Intervention hint derived from stage only — no invented TAT. */
  interventionHint: string;
  href?: string;
}

export interface ChanakyaBusinessIntelligenceSignal {
  id: string;
  label: string;
  valueLabel: string;
  detail: string;
  /** True when value comes from an existing SSOT compose path. */
  sourced: boolean;
}

export interface ChanakyaRecommendationItem {
  id: string;
  rank: number;
  title: string;
  reason: string;
  nextStep: string;
  href?: string;
  tone: "danger" | "warning" | "info" | "success";
}

export type ChanakyaAlertSeverity = "critical" | "warning" | "info";

export interface ChanakyaAlertItem {
  id: string;
  severity: ChanakyaAlertSeverity;
  title: string;
  detail: string;
  href?: string;
  /** Foundation flag — future proactive engine may set delivery channels. */
  channels: Array<"in_app" | "voice_future">;
}

export interface ChanakyaDocumentIntelligenceCapability {
  status: "reserved";
  summary: string;
  permittedContext: string[];
  documentFamilies: string[];
  gapNote: string;
}

export interface ChanakyaConversationPrompt {
  id: string;
  label: string;
}

export interface ChanakyaDashboardIntelligenceSnapshot {
  asOf: string;
  readOnly: true;
  greeting: string;
  partnerLine: string;
  executiveStatement: string;
  attentionSummary: string;
  attentionCount: number;
  attention: ChanakyaIntelligenceAttentionItem[];
  nearingCompletion: ChanakyaNearingCompletionItem[];
  businessIntelligence: ChanakyaBusinessIntelligenceSignal[];
  recommendations: ChanakyaRecommendationItem[];
  alerts: ChanakyaAlertItem[];
  documentIntelligence: ChanakyaDocumentIntelligenceCapability;
  conversationPrompts: ChanakyaConversationPrompt[];
  gaps: string[];
}
