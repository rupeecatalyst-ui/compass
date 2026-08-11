/**
 * CO-SARATHI-UX-002 — Natural conversation timing (experience layer).
 * Adaptive think floors + progressive labels — not a fixed artificial delay.
 */

import type { SarathiUxPhase } from "./ux-flow";

export type SarathiThinkComplexity =
  | "greeting"
  | "simple"
  | "standard"
  | "complex"
  | "recommendation";

export type SarathiNaturalThinkPlan = {
  complexity: SarathiThinkComplexity;
  /** Soft minimum think display — scales with task; jittered at runtime */
  softMinMs: number;
  /** Cap so we never hold the customer artificially long after work finishes */
  softMaxMs: number;
  progressiveLabels: string[];
  /** Presentation stream pace (ms between chunks) when provider streaming is unavailable */
  streamChunkMs: number;
};

/**
 * Context-aware status (CO-SARATHI-VOICE-001).
 * processing → Understanding… · reviewing → I'm reviewing…
 * "Listening..." is reserved for active mic recording only.
 */
export const SARATHI_PROGRESSIVE_THINKING = {
  standard: [
    "Understanding your request...",
    "I'm reviewing what you've shared...",
  ],
  complex: [
    "Understanding your request...",
    "I'm reviewing what you've shared...",
    "Preparing my recommendation…",
  ],
  recommendation: [
    "I'm reviewing what you've shared...",
    "Preparing my recommendation…",
  ],
} as const;

export function classifySarathiThinkComplexity(input: {
  utterance: string;
  phase: SarathiUxPhase;
  emitProposals?: boolean;
  userTurnCount: number;
}): SarathiThinkComplexity {
  if (input.emitProposals || input.phase === "confirmed" || input.phase === "advising") {
    return "recommendation";
  }

  const t = input.utterance.trim().toLowerCase();
  if (!t) return "simple";

  if (
    /^(hi|hello|hey|namaste|good\s+(morning|afternoon|evening))\b/.test(t) ||
    t.length < 12
  ) {
    return "greeting";
  }

  if (
    /compar(e|ison)|eligib|afford|emi\b|foir|dscr|analysis|recommend|which\s+lender|best\s+option|complex|vs\b/.test(
      t,
    ) ||
    t.length > 160
  ) {
    return "complex";
  }

  if (
    /home\s*loan|balance\s*transfer|\blap\b|working\s*capital|business\s*loan|personal\s*loan|property|amount|lakh|crore/.test(
      t,
    ) ||
    input.userTurnCount <= 1
  ) {
    return "standard";
  }

  return "simple";
}

export function buildSarathiNaturalThinkPlan(
  complexity: SarathiThinkComplexity,
): SarathiNaturalThinkPlan {
  switch (complexity) {
    case "greeting":
      return {
        complexity,
        softMinMs: 180,
        softMaxMs: 420,
        progressiveLabels: [],
        streamChunkMs: 18,
      };
    case "simple":
      return {
        complexity,
        softMinMs: 320,
        softMaxMs: 700,
        progressiveLabels: [],
        streamChunkMs: 22,
      };
    case "standard":
      return {
        complexity,
        softMinMs: 550,
        softMaxMs: 1400,
        progressiveLabels: [...SARATHI_PROGRESSIVE_THINKING.standard],
        streamChunkMs: 28,
      };
    case "complex":
      return {
        complexity,
        softMinMs: 900,
        softMaxMs: 2200,
        progressiveLabels: [...SARATHI_PROGRESSIVE_THINKING.complex],
        streamChunkMs: 32,
      };
    case "recommendation":
      return {
        complexity,
        softMinMs: 800,
        softMaxMs: 2000,
        progressiveLabels: [...SARATHI_PROGRESSIVE_THINKING.recommendation],
        streamChunkMs: 30,
      };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * After platform work completes, optionally wait the remainder of a soft floor.
 * Floor is jittered (±15%) so timing never feels scripted/identical.
 */
export async function awaitSarathiNaturalThinkFloor(
  startedAtMs: number,
  plan: SarathiNaturalThinkPlan,
): Promise<void> {
  const elapsed = Date.now() - startedAtMs;
  const jitter = 0.85 + Math.random() * 0.3;
  const target = Math.min(plan.softMaxMs, Math.round(plan.softMinMs * jitter));
  const remain = target - elapsed;
  if (remain > 50) await sleep(remain);
}

/**
 * Advance progressive labels while work runs. Caller cancels via AbortSignal.
 */
export function startSarathiProgressiveThinking(input: {
  labels: string[];
  onLabel: (label: string) => void;
  signal: AbortSignal;
}): void {
  if (input.labels.length === 0) return;
  let i = 0;
  input.onLabel(input.labels[0]!);
  const stepMs = Math.max(400, Math.floor(900 / Math.max(1, input.labels.length)));
  const id = setInterval(() => {
    if (input.signal.aborted) {
      clearInterval(id);
      return;
    }
    i += 1;
    if (i >= input.labels.length) {
      clearInterval(id);
      return;
    }
    input.onLabel(input.labels[i]!);
  }, stepMs);
  input.signal.addEventListener(
    "abort",
    () => {
      clearInterval(id);
    },
    { once: true },
  );
}
