/**
 * ECM validation.
 */

import type { EcmContact, EcmContactRole, EcmValidationResult } from "@/types/enterprise-contact-master";

function issue(
  code: string,
  message: string,
  severity: "error" | "warning" = "error",
): EcmValidationResult["issues"][0] {
  return { code, severity, message };
}

export function validateEcmContact(
  contact: Pick<EcmContact, "name" | "mobilePrimary"> & {
    roles?: EcmContactRole[];
    primaryRole?: EcmContactRole;
  },
): EcmValidationResult {
  const issues = [];
  if (!contact.name?.trim()) issues.push(issue("ECM_MISSING_NAME", "Contact name is required."));
  if (!contact.mobilePrimary?.trim()) issues.push(issue("ECM_MISSING_MOBILE", "Primary mobile is required."));
  const hasRoles = Boolean(contact.roles?.length || contact.primaryRole);
  if (!hasRoles) issues.push(issue("ECM_MISSING_ROLE", "At least one role is required."));
  return { valid: issues.filter((i) => i.severity === "error").length === 0, issues };
}
