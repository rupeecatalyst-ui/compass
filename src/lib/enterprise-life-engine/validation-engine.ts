/**
 * LIFE validation and lender selection.
 */

import { LIFE_ACTIVE_STATUS, LIFE_EXCLUDED_ROLES_UNLESS_EXECUTOR } from "@/constants/enterprise-life-engine";
import {
  findPublishedLenderByDisplayName,
  listPublishedLenderOptions,
  resolvePublishedEnterpriseLenderId,
} from "@/lib/enterprise-lender-registry/published-directory";
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

/** CO-LENDER-ARCH-001 — Contact must resolve to a Published Enterprise Lender. */
function isContactLinkedToPublishedLender(contact: LifeLenderContact): boolean {
  const byRef = resolvePublishedEnterpriseLenderId(contact.lenderRef);
  if (byRef) return true;
  return Boolean(findPublishedLenderByDisplayName(contact.lenderName));
}

export function isLifeEligibleLenderExecutor(contact: LifeLenderContact): boolean {
  if (!contact.enabled || !contact.lenderExecutor) return false;
  if (!isContactLinkedToPublishedLender(contact)) return false;
  const hasExcludedOnly =
    contact.roles.length > 0 &&
    contact.roles.every((r) =>
      (LIFE_EXCLUDED_ROLES_UNLESS_EXECUTOR as readonly string[]).includes(r),
    );
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
  // Ensure Soft Go-Live master is present so published gate is meaningful.
  const published = listPublishedLenderOptions();
  if (published.length === 0) return [];

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
      const enterpriseId =
        resolvePublishedEnterpriseLenderId(contact.lenderRef) ||
        findPublishedLenderByDisplayName(contact.lenderName)?.id ||
        null;
      const hints = getLifePorts().recommendationHints.listByContact(contact.id);
      const hintBoost = hints.reduce((sum, h) => sum + (h.enabled ? h.weight : 0), 0);
      const score = 50 + hintBoost + contact.productRefs.length + contact.businessMappingRefs.length;
      return {
        contact,
        lenderRef: enterpriseId ? `lender:${enterpriseId}` : contact.lenderRef,
        lenderName:
          (enterpriseId &&
            published.find((p) => p.id === enterpriseId)?.displayName) ||
          contact.lenderName,
        branchRef: contact.branchRef,
        branchName: contact.branchName,
        reportingHierarchy: contact.reportingHierarchy,
        reportingManagerRef: contact.reportingManagerRef,
        reportingManagerName: contact.reportingManagerName,
        selectionReason:
          "Matched case product, city, and business mapping against Published Enterprise Lender",
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
