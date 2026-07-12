/**
 * ECM validation.
 */

import type { EcmContact, EcmValidationResult } from "@/types/enterprise-contact-master";

function issue(
  code: string,
  message: string,
  severity: "error" | "warning" = "error",
): EcmValidationResult["issues"][0] {
  return { code, severity, message };
}

export function validateEcmContact(contact: Pick<EcmContact, "name" | "mobilePrimary" | "primaryRole">): EcmValidationResult {
  const issues = [];
  if (!contact.name?.trim()) issues.push(issue("ECM_MISSING_NAME", "Contact name is required."));
  if (!contact.mobilePrimary?.trim()) issues.push(issue("ECM_MISSING_MOBILE", "Primary mobile is required."));
  if (!contact.primaryRole) issues.push(issue("ECM_MISSING_ROLE", "Primary role is required."));
  return { valid: issues.filter((i) => i.severity === "error").length === 0, issues };
}
