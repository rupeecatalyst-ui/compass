/**
 * CO-AI-G2-W1 — Shadow Mode types (capture + comparison).
 * Shadow output never becomes customer-facing in Wave 1.
 */

import type {
  EaoConversationRequestContract,
  EaoConversationResponseContract,
  EaoDialogueObjective,
} from "./contracts";

export type EaoShadowRunStatus =
  | "skipped_flag_off"
  | "completed"
  | "failed"
  | "timeout";

export interface EaoShadowLiveSnapshot {
  facingText: string;
  objectiveHint?: string | null;
  sessionId: string;
  conversationId: string;
  utterance: string;
  capturedAt: string;
}

export interface EaoShadowComparisonDimension {
  id: string;
  label: string;
  /** 0–1 similarity / agreement score for this dimension */
  score: number;
  notes: string;
}

export interface EaoShadowComparisonResult {
  comparisonId: string;
  overallScore: number;
  dimensions: EaoShadowComparisonDimension[];
  liveFacingPreview: string;
  shadowFacingPreview: string;
  diverged: boolean;
  comparedAt: string;
}

export interface EaoShadowCaptureRecord {
  shadowId: string;
  status: EaoShadowRunStatus;
  live: EaoShadowLiveSnapshot;
  request: EaoConversationRequestContract | null;
  response: EaoConversationResponseContract | null;
  comparison: EaoShadowComparisonResult | null;
  errorMessage?: string;
  durationMs: number;
  shadowModeVersion: string;
  recordedAt: string;
  /** Always true in G2-W1 — customer never receives this response */
  customerIsolated: true;
}

export interface EaoShadowInvokeInput {
  live: EaoShadowLiveSnapshot;
  /** Optional pre-built request; pipeline may assemble a minimal request if omitted */
  request?: EaoConversationRequestContract;
}

export type { EaoDialogueObjective };
