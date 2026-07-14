/**
 * LIFE validation and lender selection.
 */

import { LIFE_ACTIVE_STATUS, LIFE_EXCLUDED_ROLES_UNLESS_EXECUTOR } from "@/constants/enterprise-life-engine";
import type {
  LifeLenderContact,
  LifeLenderSelectionCriteria,
  LifeLenderSelectionResult,
  LifeValidationResult,
} from "@/types/enterprise-life-engine";
import { getLifePorts } from "./composition";

function issue(code: string, message: string, severity: "error" | "warning" = "error"): LifeValidationResult["issues"][0] {
  return { code, severity, message };
}

export function isLifeEligibleLenderExecutor(contact: LifeLenderContact): boolean {
  if (!contact.enabled || !contact.lenderExecutor) return false;
  const hasExcludedOnly =
    contact.roles.length > 0 &&
    contact.roles.every((r) =>
      (LIFE_EXCLUDED_ROLES_UNLESS_EXECUTOR as readonly string[]).includes(r),
    );
  // Credit / operations / policy contacts are excluded unless lenderExecutor is TRUE (already checked).
  if (hasExcludedOnly && !contact.lenderExecutor) return false;
  return contact.lenderExecutor === true;
}

export function validateLifeLenderContact(contact: LifeLenderContact): LifeValidationResult {
  const issues = [];
  if (!contact.contactName) issues.push(issue("LIFE_MISSING_NAME", "Contact name is required."));
  if (!contact.lenderRef) issues.push(issue("LIFE_MISSING_LENDER", "Lender reference is required."));
  if (!contact.city) issues.push(issue("LIFE_MISSING_CITY", "City is required."));
  if (!contact.productRefs.length) issues.push(issue("LIFE_MISSING_PRODUCT", "At least one product is required."));
  return { valid: issues.filter((i) => i.severity === "error").length === 0, issues };
}

export function selectLifeLenderExecutors(
  criteria: LifeLenderSelectionCriteria,
): LifeLenderSelectionResult[] {
  const requireActive = criteria.requireActive !== false;
  const candidates = getLifePorts()
    .contacts.listLenderExecutors()
    .filter((c) => isLifeEligibleLenderExecutor(c))
    .filter((c) => !requireActive || c.activeStatus === LIFE_ACTIVE_STATUS.ACTIVE)
    .filter((c) => c.city.toLowerCase() === criteria.city.toLowerCase())
    .filter((c) => c.productRefs.includes(criteria.productRef))
    .filter(
      (c) =>
        !criteria.businessMappingRef ||
        c.businessMappingRefs.includes(criteria.businessMappingRef),
    );

  return candidates
    .map((contact) => {
      const hints = getLifePorts().recommendationHints.listByContact(contact.id);
      const hintBoost = hints.reduce((sum, h) => sum + (h.enabled ? h.weight : 0), 0);
      const score = 50 + hintBoost + contact.productRefs.length + contact.businessMappingRefs.length;
      return {
        contact,
        lenderRef: contact.lenderRef,
        lenderName: contact.lenderName,
        branchRef: contact.branchRef,
        branchName: contact.branchName,
        reportingHierarchy: contact.reportingHierarchy,
        reportingManagerRef: contact.reportingManagerRef,
        reportingManagerName: contact.reportingManagerName,
        selectionReason: "Matched case product, city, and business mapping",
        recommendationScore: score,
      } satisfies LifeLenderSelectionResult;
    })
    .sort((a, b) => b.recommendationScore - a.recommendationScore);
}

export function resolveLifeLenderSelection(contactId: string): LifeLenderSelectionResult | undefined {
  const contact = getLifePorts().contacts.findById(contactId);
  if (!contact || !isLifeEligibleLenderExecutor(contact)) return undefined;
  return {
    contact,
    lenderRef: contact.lenderRef,
    lenderName: contact.lenderName,
    branchRef: contact.branchRef,
    branchName: contact.branchName,
    reportingHierarchy: contact.reportingHierarchy,
    reportingManagerRef: contact.reportingManagerRef,
    reportingManagerName: contact.reportingManagerName,
    selectionReason: "Manual contact selection",
    recommendationScore: 100,
  };
}
