/**
 * CO-AI-G2-W1 — Shadow vs live comparison framework.
 * Analytical only — never selects customer-facing text.
 */

import type {
  EaoShadowComparisonDimension,
  EaoShadowComparisonResult,
  EaoShadowLiveSnapshot,
} from "@/types/enterprise-ai-orchestrator/shadow";
import type { EaoConversationResponseContract } from "@/types/enterprise-ai-orchestrator";

function normalise(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function tokenSet(text: string): Set<string> {
  return new Set(
    normalise(text)
      .split(/[^a-z0-9\u0900-\u097f]+/i)
      .filter((t) => t.length > 2),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function lengthRatio(a: string, b: string): number {
  const la = a.trim().length;
  const lb = b.trim().length;
  if (la === 0 && lb === 0) return 1;
  const max = Math.max(la, lb, 1);
  return 1 - Math.abs(la - lb) / max;
}

const BANNED =
  /explore your options|feels useful next|i'm listening|share whatever/i;

export function compareEaoShadowToLive(input: {
  live: EaoShadowLiveSnapshot;
  shadow: EaoConversationResponseContract;
}): EaoShadowComparisonResult {
  const liveText = input.live.facingText;
  const shadowText = input.shadow.facingText;
  const liveTokens = tokenSet(liveText);
  const shadowTokens = tokenSet(shadowText);

  const lexical = jaccard(liveTokens, shadowTokens);
  const length = lengthRatio(liveText, shadowText);
  const bothNonEmpty = liveText.trim().length > 0 && shadowText.trim().length > 0 ? 1 : 0;
  const shadowAvoidsBanned = BANNED.test(shadowText) ? 0 : 1;
  const liveAvoidsBanned = BANNED.test(liveText) ? 0 : 1;
  const objectiveHint =
    input.live.objectiveHint &&
    input.shadow.objective &&
    input.live.objectiveHint === input.shadow.objective
      ? 1
      : input.live.objectiveHint
        ? 0.4
        : 0.7;

  const dimensions: EaoShadowComparisonDimension[] = [
    {
      id: "lexical_overlap",
      label: "Lexical overlap",
      score: lexical,
      notes: "Token Jaccard between live and shadow facing text",
    },
    {
      id: "length_similarity",
      label: "Length similarity",
      score: length,
      notes: "Relative length closeness",
    },
    {
      id: "both_non_empty",
      label: "Both produced text",
      score: bothNonEmpty,
      notes: "Live and shadow both non-empty",
    },
    {
      id: "shadow_no_banned_generics",
      label: "Shadow avoids banned generics",
      score: shadowAvoidsBanned,
      notes: "Shadow must not use retired chatbot generics",
    },
    {
      id: "live_no_banned_generics",
      label: "Live avoids banned generics",
      score: liveAvoidsBanned,
      notes: "Live path hygiene signal",
    },
    {
      id: "objective_alignment",
      label: "Objective alignment",
      score: objectiveHint,
      notes: "Compare live objective hint to shadow objective when present",
    },
  ];

  const overallScore =
    dimensions.reduce((s, d) => s + d.score, 0) / Math.max(1, dimensions.length);

  return {
    comparisonId: `eao_cmp_${crypto.randomUUID()}`,
    overallScore: Math.round(overallScore * 1000) / 1000,
    dimensions,
    liveFacingPreview: liveText.slice(0, 240),
    shadowFacingPreview: shadowText.slice(0, 240),
    diverged: overallScore < 0.55,
    comparedAt: new Date().toISOString(),
  };
}
