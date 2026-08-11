/**
 * CO-AI-G2-W5 — Sample context packs for offline analyzer BAT.
 */

import type { EaoEnterpriseContextContract } from "@/types/enterprise-ai-orchestrator/contracts";
import type { EaoContextQualityInput } from "@/types/enterprise-ai-orchestrator/context-quality";

function basePack(
  packId: string,
  overrides: Partial<EaoEnterpriseContextContract>,
): EaoEnterpriseContextContract {
  return {
    contractId: "eao.context.v1",
    packId,
    sessionId: "sess_ctxq",
    conversationId: "conv_ctxq",
    personaPackId: "sarathi_customer",
    assembledAt: new Date().toISOString(),
    contentHash: `hash_${packId}`,
    customerFacts: [],
    opportunityFacts: [],
    dealFacts: [],
    productFacts: [],
    policyHints: [],
    readiness: null,
    redactionNotes: [],
    authorityNote: "enterprise_engines_are_ssot",
    ...overrides,
  };
}

export const EAO_CONTEXT_QUALITY_FIXTURES: EaoContextQualityInput[] = [
  {
    label: "Healthy home-loan context",
    productPath: "home_loan",
    utterance: "I want to buy my first home in Pune",
    promptSizeBudgetChars: 12_000,
    context: basePack("pack_healthy_hl", {
      customerFacts: [
        {
          key: "location",
          value: "Pune",
          provenance: "user_utterance",
          observedAt: new Date().toISOString(),
        },
        {
          key: "employment",
          value: "salaried",
          provenance: "enterprise_registry",
          sourceId: "ecm_contact_1",
          observedAt: new Date().toISOString(),
        },
      ],
      productFacts: [
        {
          key: "product",
          value: "Home Loan",
          provenance: "enterprise_registry",
          sourceId: "product_hl",
          observedAt: new Date().toISOString(),
        },
        {
          key: "loan_type",
          value: "home_loan",
          provenance: "consultation_readiness",
          observedAt: new Date().toISOString(),
        },
      ],
      opportunityFacts: [
        {
          key: "purpose",
          value: "purchase ready flat",
          provenance: "user_utterance",
          observedAt: new Date().toISOString(),
        },
        {
          key: "funding_amount",
          value: "approximate TBD",
          provenance: "consultation_readiness",
          advisoryOnly: true,
          observedAt: new Date().toISOString(),
        },
      ],
      readiness: {
        consultationConfidence: 55,
        confidenceBand: "moderate",
        missingInformation: [
          {
            slotId: "required_amount",
            label: "Amount",
            reason: "Funding amount not confirmed",
            priority: 1,
          },
        ],
        proposalReadiness: "not_ready",
        actionReadiness: "not_ready",
        creVersion: "cre.fixture",
      },
    }),
    memory: {
      contractId: "eao.memory.v1",
      memoryId: "mem_healthy",
      sessionId: "sess_ctxq",
      conversationId: "conv_ctxq",
      knownFacts: [
        {
          key: "location",
          value: "Pune",
          provenance: "user_utterance",
          observedAt: new Date().toISOString(),
        },
      ],
      customerGoals: ["Buy first home"],
      pendingWriteIntents: [],
      updatedAt: new Date().toISOString(),
      authorityNote: "consultation_memory_not_crm_ssot",
    },
  },
  {
    label: "Noisy / bloated / stale context",
    productPath: "business_loan",
    utterance: "How fast can I get a business loan?",
    promptSizeBudgetChars: 2_000,
    context: basePack("pack_noisy_bl", {
      assembledAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
      customerFacts: [
        {
          key: "cricket_team",
          value: "Mumbai Indians",
          provenance: "model_inference_untrusted",
        },
        {
          key: "astrology_sign",
          value: "Leo",
          provenance: "model_inference_untrusted",
        },
      ],
      policyHints: Array.from({ length: 40 }, (_, i) => ({
        key: `filler_policy_${i}`,
        value: `padding-${i}-${"x".repeat(80)}`,
        provenance: "system_metadata" as const,
      })),
      productFacts: [
        {
          key: "loan_type",
          value: "business_loan",
          provenance: "user_utterance",
        },
      ],
    }),
    memory: {
      contractId: "eao.memory.v1",
      memoryId: "mem_noisy",
      sessionId: "sess_ctxq",
      conversationId: "conv_ctxq",
      knownFacts: [],
      customerGoals: [],
      pendingWriteIntents: Array.from({ length: 8 }, (_, i) => ({
        key: `pending_${i}`,
        value: "x",
        confidence: "low" as const,
      })),
      updatedAt: new Date().toISOString(),
      authorityNote: "consultation_memory_not_crm_ssot",
    },
  },
];
