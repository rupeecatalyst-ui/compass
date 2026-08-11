/**
 * Context Package validator (CO-AI-103).
 */

import {
  EAI_CONTEXT_DOMAINS,
  EAI_DEFAULT_CONTEXT_BUDGET_POLICY,
} from "@/constants/enterprise-ai-platform/context-intelligence";
import type {
  EaiContextDomain,
  EaiContextPackage,
  EaiContextValidationResult,
} from "@/types/enterprise-ai-context-intelligence";
import { approximateEaiPackageChars } from "./budget";
import { listEaiContextProviders } from "./providers";

export function validateEaiContextPackage(
  pkg: EaiContextPackage,
): EaiContextValidationResult {
  const issues: EaiContextValidationResult["issues"] = [];

  if (!pkg.packageId) {
    issues.push({ code: "missing_package_id", message: "packageId required", severity: "error" });
  }
  if (!pkg.versioning?.packageVersion || !pkg.versioning?.builderVersion) {
    issues.push({
      code: "missing_versioning",
      message: "Context Package versioning incomplete",
      severity: "error",
    });
  }
  if (!pkg.versioning?.builtAt) {
    issues.push({
      code: "missing_timestamp",
      message: "versioning.builtAt required",
      severity: "error",
    });
  }

  const seen = new Set<EaiContextDomain>();
  for (const section of pkg.sections) {
    if (!EAI_CONTEXT_DOMAINS.includes(section.domain)) {
      issues.push({
        code: "invalid_domain",
        message: `Unknown domain: ${section.domain}`,
        severity: "error",
      });
    }
    if (seen.has(section.domain)) {
      issues.push({
        code: "duplicate_domain",
        message: `Duplicate domain section: ${section.domain}`,
        severity: "error",
      });
    }
    seen.add(section.domain);

    // Structural: facts must be flat sanitized shapes
    for (const fact of section.facts) {
      if (typeof fact.key !== "string" || typeof fact.value !== "string") {
        issues.push({
          code: "invalid_fact",
          message: `Invalid fact structure in domain ${section.domain}`,
          severity: "error",
        });
      }
    }
  }

  const providers = listEaiContextProviders();
  for (const domain of pkg.domainsRequested) {
    if (domain === "conversation") continue;
    const provider = providers.find((p) => p.domain === domain);
    if (!provider) {
      issues.push({
        code: "missing_provider",
        message: `No provider registered for requested domain: ${domain}`,
        severity: "error",
      });
    }
  }

  const chars = approximateEaiPackageChars(pkg.sections);
  const max = pkg.budget.policy.maxApproximateChars ?? EAI_DEFAULT_CONTEXT_BUDGET_POLICY.maxApproximateChars;
  if (chars > max * 1.25) {
    issues.push({
      code: "oversized_package",
      message: `Package approximately ${chars} chars exceeds soft ceiling ${max}`,
      severity: "warning",
    });
  }
  if (chars > max * 2) {
    issues.push({
      code: "severely_oversized_package",
      message: `Package approximately ${chars} chars severely exceeds budget`,
      severity: "error",
    });
  }

  if (!Array.isArray(pkg.sanitisationNotes) || pkg.sanitisationNotes.length === 0) {
    issues.push({
      code: "missing_sanitisation_notes",
      message: "Expected sanitisation notes on Context Package",
      severity: "warning",
    });
  }

  return {
    valid: issues.every((i) => i.severity !== "error"),
    issues,
  };
}
