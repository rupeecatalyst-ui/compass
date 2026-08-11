/**
 * Context Intelligence readiness validation (CO-AI-103).
 */

import { EAI_CONTEXT_INTELLIGENCE_VERSION } from "@/constants/enterprise-ai-platform/context-intelligence";
import type { EaiContextIntelligenceReadinessResult } from "@/types/enterprise-ai-context-intelligence";
import { compileEaiContextFromPackage } from "../context-compiler";
import { buildEaiContextPackage } from "./package-builder";
import { validateEaiContextPackage } from "./package-validator";
import { prioritiseEaiContextDomains } from "./prioritisation";
import {
  ensureEaiContextProviderStubs,
  listEaiContextProviders,
  resetEaiContextProviders,
} from "./providers";

export async function runEaiContextIntelligenceReadiness(): Promise<EaiContextIntelligenceReadinessResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  resetEaiContextProviders();
  ensureEaiContextProviderStubs();

  const providers = listEaiContextProviders();
  if (providers.length < 10) {
    errors.push(`Expected stub providers for all domains, found ${providers.length}`);
  }
  // AI-4+ may replace stubs with connector-backed providers (implemented: true).
  const unimplementedOk = providers.every(
    (p) => p.domain === "conversation" || typeof p.implemented === "boolean",
  );
  if (!unimplementedOk) {
    errors.push("Providers missing implemented flag");
  }

  const education = prioritiseEaiContextDomains({
    requestHint: "What is Balance Transfer?",
  });
  if (education.domains.includes("customer") || education.domains.includes("loan")) {
    errors.push("Balance Transfer education must not load customer/loan context");
  }
  if (!education.domains.includes("product") && !education.domains.includes("knowledge")) {
    errors.push("Balance Transfer education should include product or knowledge");
  }

  const emi = prioritiseEaiContextDomains({
    requestHint: "Should I reduce my EMI?",
  });
  if (!emi.domains.includes("loan")) {
    errors.push("EMI question must include loan context");
  }

  const pkg = await buildEaiContextPackage({
    sessionId: "sess_cie_readiness",
    conversationId: "conv_cie_readiness",
    personaPackId: "sarathi_customer",
    requestHint: "What is Balance Transfer?",
    conversationMemory: {
      intent: "product_education",
      knownFacts: [{ key: "interest", value: "balance transfer", provenance: "user_stated" }],
      openQuestions: ["Which product fits?"],
      previousRecommendations: [],
      outstandingActions: [],
      summary: "User asked about balance transfer definition",
    },
    futureAuditRef: "audit_reserved_cie",
  });

  if (pkg.domainsIncluded.includes("customer")) {
    errors.push("Built package unexpectedly included customer domain for BT education");
  }
  if (!pkg.versioning.builderVersion || !pkg.versioning.packageVersion) {
    errors.push("Context Package missing versioning");
  }
  if (!pkg.versioning.futureAuditRef) {
    errors.push("futureAuditRef not preserved");
  }

  const validation = validateEaiContextPackage(pkg);
  if (!validation.valid) {
    errors.push(
      ...validation.issues.filter((i) => i.severity === "error").map((i) => i.message),
    );
  }
  warnings.push(
    ...validation.issues.filter((i) => i.severity === "warning").map((i) => i.message),
  );

  // Compiler bridge — package → compiled context (no raw objects)
  const compiled = compileEaiContextFromPackage(pkg);
  if (!compiled.contextId || compiled.sanitizedFacts.length < 1) {
    errors.push("compileEaiContextFromPackage failed to project Context Package");
  }
  if (!compiled.redactionNotes.some((n) => /Context Intelligence/i.test(n))) {
    errors.push("Compiled context missing Context Intelligence projection note");
  }

  // Budget architecture smoke — tiny ceiling forces truncation path
  const tight = await buildEaiContextPackage({
    sessionId: "sess_cie_budget",
    conversationId: "conv_cie_budget",
    personaPackId: "platform_none",
    requestHint: "policy eligibility FOIR guidelines",
    forceDomains: ["policy", "knowledge", "product", "conversation", "workflow"],
    budgetPolicy: { maxApproximateChars: 80 },
    conversationMemory: {
      knownFacts: Array.from({ length: 12 }, (_, i) => ({
        key: `fact_${i}`,
        value: `value_${i}_`.repeat(20),
        provenance: "system" as const,
      })),
      openQuestions: ["q1", "q2"],
      previousRecommendations: ["r1"],
      outstandingActions: ["a1"],
      summary: "x".repeat(200),
    },
  });
  if (!tight.budget.truncated && tight.budget.approximateChars > 80) {
    warnings.push("Tight budget did not mark truncated (may still be under ceiling after stubs)");
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    details: {
      contextIntelligenceVersion: EAI_CONTEXT_INTELLIGENCE_VERSION,
      providerCount: providers.length,
      educationDomains: education.domains,
      emiDomains: emi.domains,
      samplePackageId: pkg.packageId,
      sampleDomainsIncluded: pkg.domainsIncluded,
      validationIssueCount: validation.issues.length,
      tightBudgetTruncated: tight.budget.truncated,
      tightApproxChars: tight.budget.approximateChars,
    },
  };
}
