/**
 * Context Builder — assemble Context Packages (CO-AI-103 + CO-AI-104 DIE).
 * No business calculations. Providers supply sanitized slices only.
 * Domain Boundary is mandatory before knowledge retrieval.
 */

import {
  EAI_CONTEXT_BUILDER_VERSION,
  EAI_CONTEXT_PACKAGE_VERSION,
} from "@/constants/enterprise-ai-platform/context-intelligence";
import { EAI_OUTSIDE_DOMAIN_REFUSAL } from "@/constants/enterprise-ai-platform/domain-governance";
import type {
  EaiContextBuildRequest,
  EaiContextDomainSection,
  EaiContextPackage,
} from "@/types/enterprise-ai-context-intelligence";
import { evaluateEaiDomainBoundary } from "../domain-governance/domain-boundary";
import { bootstrapEaiReadConnectorsLayer } from "../read-connectors/bootstrap";
import { applyEaiContextBudget, resolveEaiContextBudgetPolicy } from "./budget";
import {
  conversationMemoryToFacts,
  normaliseEaiConversationMemory,
} from "./conversation-memory";
import { prioritiseEaiContextDomains } from "./prioritisation";
import { ensureEaiContextProviderStubs, invokeEaiContextProvider } from "./providers";
import { sanitiseEaiProviderResult } from "./sanitisation";

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function emptyBlockedPackage(
  request: EaiContextBuildRequest,
  refusalText: string,
): EaiContextPackage {
  const budgetPolicy = resolveEaiContextBudgetPolicy(request.budgetPolicy);
  return {
    packageId: newId("eai_ctxpkg"),
    sessionId: request.sessionId,
    conversationId: request.conversationId,
    personaPackId: request.personaPackId,
    requestHint: request.requestHint,
    domainsRequested: [],
    domainsIncluded: [],
    sections: [],
    conversationMemory: undefined,
    budget: {
      policy: budgetPolicy,
      approximateChars: 0,
      truncated: false,
      summaryReplacedDomains: [],
      omittedDomains: [],
    },
    sanitisationNotes: [
      "Domain Boundary blocked — no knowledge retrieval",
      "LLM must not be called for outside-domain requests",
    ],
    versioning: {
      packageVersion: EAI_CONTEXT_PACKAGE_VERSION,
      builderVersion: EAI_CONTEXT_BUILDER_VERSION,
      providerVersions: {},
      builtAt: nowIso(),
      futureAuditRef: request.futureAuditRef,
    },
    domainBoundaryBlocked: true,
    domainRefusalText: refusalText,
  };
}

/**
 * Build a canonical Enterprise AI Context Package.
 * This is the sole entry point for preparing AI context (AI-3+).
 * AI-4 DIE: Domain Boundary runs first — outside domain skips all providers.
 */
export async function buildEaiContextPackage(
  request: EaiContextBuildRequest,
): Promise<EaiContextPackage> {
  const utterance = (request.requestHint ?? "").trim();
  if (utterance) {
    const domain = evaluateEaiDomainBoundary({
      utterance,
      personaPackId: request.personaPackId,
    });
    if (domain.blocksKnowledge) {
      return emptyBlockedPackage(
        request,
        domain.safeRefusalText ?? EAI_OUTSIDE_DOMAIN_REFUSAL,
      );
    }
  }

  ensureEaiContextProviderStubs();
  bootstrapEaiReadConnectorsLayer();

  const prioritisation = prioritiseEaiContextDomains({
    requestHint: request.requestHint,
    forceDomains: request.forceDomains,
  });

  const budgetPolicy = resolveEaiContextBudgetPolicy(request.budgetPolicy);
  const conversationMemory = normaliseEaiConversationMemory(request.conversationMemory);
  const sanitisationNotes: string[] = [...prioritisation.notes];
  const providerVersions: Record<string, string> = {};

  const sections: EaiContextDomainSection[] = [];

  for (const domain of prioritisation.domains) {
    if (domain === "conversation" && conversationMemory) {
      const facts = conversationMemoryToFacts(conversationMemory);
      sections.push({
        domain: "conversation",
        priority: "critical",
        facts,
        refs: [],
        summary: conversationMemory.summary,
        providerId: "eai.ctx.conversation_memory",
        providerVersion: "1.0.0",
        included: true,
      });
      providerVersions["eai.ctx.conversation_memory"] = "1.0.0";
      continue;
    }

    const raw = await invokeEaiContextProvider({
      sessionId: request.sessionId,
      conversationId: request.conversationId,
      personaPackId: request.personaPackId,
      domain,
      requestHint: request.requestHint,
      entityRefs: request.entityRefs,
    });

    const { result, notes } = sanitiseEaiProviderResult(raw);
    sanitisationNotes.push(...notes);
    providerVersions[result.providerId] = result.providerVersion;

    sections.push({
      domain,
      priority: domain === "conversation" ? "critical" : "normal",
      facts: result.facts,
      refs: result.refs,
      summary: result.summary,
      providerId: result.providerId,
      providerVersion: result.providerVersion,
      included: true,
    });
  }

  const budgeted = applyEaiContextBudget(sections, budgetPolicy);

  return {
    packageId: newId("eai_ctxpkg"),
    sessionId: request.sessionId,
    conversationId: request.conversationId,
    personaPackId: request.personaPackId,
    requestHint: request.requestHint,
    domainsRequested: prioritisation.domains,
    domainsIncluded: budgeted.sections.filter((s) => s.included).map((s) => s.domain),
    sections: budgeted.sections,
    conversationMemory,
    budget: {
      policy: budgetPolicy,
      approximateChars: budgeted.approximateChars,
      truncated: budgeted.truncated,
      summaryReplacedDomains: budgeted.summaryReplacedDomains,
      omittedDomains: budgeted.omittedDomains,
    },
    sanitisationNotes: [...new Set(sanitisationNotes)],
    versioning: {
      packageVersion: EAI_CONTEXT_PACKAGE_VERSION,
      builderVersion: EAI_CONTEXT_BUILDER_VERSION,
      providerVersions,
      builtAt: nowIso(),
      futureAuditRef: request.futureAuditRef,
    },
  };
}
