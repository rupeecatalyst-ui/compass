/**
 * CO-C1-CHANAKYA-REALTIME-INTELLIGENCE-001
 * User-friendly grounding brief from enterprise-read compile — no provenance keys, no PII.
 */

import type { ChanakyaEnterpriseReadCompileResult } from "@/types/chanakya-enterprise-read-context";
import type { ChanakyaInappEntityRefs, ChanakyaInappIntent } from "@/types/chanakya-inapp-conversation";
import type { ChanakyaGroundingBrief } from "@/types/chanakya-conversation-intelligence";
import { redactFacingIntelligenceText } from "./facing-redact";
import {
  buildInterventionCards,
  INTERVENTION_EMPTY_CRITERIA,
  similarInterventionCards,
} from "./intervention-cards";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s || null;
}

function liveTrustedFromCompile(compile: ChanakyaEnterpriseReadCompileResult | null): boolean {
  const ta = asRecord(compile?.transactionAttention);
  const hydration = asRecord(ta?.portfolioHydration);
  if (typeof ta?.isLiveTrusted === "boolean") return ta.isLiveTrusted;
  if (hydration?.availability === "AVAILABLE") return true;
  return Boolean(compile && compile.opportunity360 || compile?.deal360 || compile?.transactionAttention);
}

function friendlyLimitation(raw: string): string | null {
  const text = redactFacingIntelligenceText(raw);
  if (!text) return null;
  if (/read-only/i.test(text)) return null;
  return text;
}

export function buildChanakyaGroundingBrief(input: {
  intent: ChanakyaInappIntent;
  entity: ChanakyaInappEntityRefs;
  compile: ChanakyaEnterpriseReadCompileResult | null;
  askedAt?: string;
}): ChanakyaGroundingBrief {
  const compile = input.compile;
  const compiledAt = compile?.compiledAt ?? null;
  const liveTrusted = liveTrustedFromCompile(compile);
  const freshnessLabel = compiledAt
    ? liveTrusted
      ? `live operational records as of ${compiledAt}`
      : `compiled ${compiledAt} — treat as current only if live trust is confirmed`
    : "live compile unavailable";

  const productFilter =
    input.intent === "intervention_queue" ? "business_loan" : "all";
  const cards = buildInterventionCards({
    transactionAttention: asRecord(compile?.transactionAttention),
    compiledAt,
    liveTrusted,
    productFilter,
    limit: 10,
  });

  const focusCard =
    cards.find(
      (card) =>
        (input.entity.dealId &&
          (card.dealId === input.entity.dealId || card.dealRef === input.entity.dealId)) ||
        (input.entity.opportunityId &&
          (card.opportunityId === input.entity.opportunityId ||
            card.opportunityRef === input.entity.opportunityId)),
    ) || (cards.length === 1 ? cards[0] : null);

  const entityNotes: string[] = [];
  const exec = compile?.transactionExecutiveSnapshot;
  if (exec?.executiveSynthesis) {
    entityNotes.push(redactFacingIntelligenceText(exec.executiveSynthesis));
  }
  const attn = asRecord(compile?.transactionAttention);
  const entityAttention = asRecord(attn?.entityAttention);
  const entityWhy = Array.isArray(entityAttention?.why)
    ? entityAttention.why.map((item) => redactFacingIntelligenceText(String(item)))
    : [];
  entityNotes.push(...entityWhy.filter(Boolean).slice(0, 6));

  const changeSummary = redactFacingIntelligenceText(
    str(compile?.changeIntelligence?.summary) || "",
  );
  const creditSummary = redactFacingIntelligenceText(
    str(compile?.creditIntelligence?.creditAssessment?.overallAssessment?.summary) ||
      str(
        compile?.opportunity360?.slices.credit?.summary ||
          compile?.deal360?.slices.credit?.summary,
      ) ||
      "",
  );
  const lenderSummary = redactFacingIntelligenceText(
    str(compile?.productLenderIntelligence?.summary) || "",
  );

  const documentNotes = (compile?.limitations ?? [])
    .map(friendlyLimitation)
    .filter((item): item is string => Boolean(item))
    .slice(0, 4);

  const emptyCriteria =
    cards.length === 0
      ? [...INTERVENTION_EMPTY_CRITERIA]
      : null;

  return {
    askedAt: input.askedAt || new Date().toISOString(),
    compiledAt,
    liveTrusted,
    freshnessLabel,
    intent: input.intent,
    focus: {
      opportunityRef: input.entity.opportunityId || focusCard?.opportunityRef || null,
      dealRef: input.entity.dealId || focusCard?.dealRef || null,
    },
    interventionCards: cards,
    similarCards: similarInterventionCards(cards, focusCard),
    deskSummary: redactFacingIntelligenceText(
      str(asRecord(compile?.enterpriseSummary)?.summary) ||
        str(asRecord(compile?.enterpriseSummary)?.headline) ||
        "",
    ) || null,
    entityNotes: entityNotes.filter(Boolean).slice(0, 8),
    emptyCriteria,
    changeSummary: changeSummary || null,
    creditSummary: creditSummary || null,
    lenderSummary: lenderSummary || null,
    documentNotes,
  };
}
