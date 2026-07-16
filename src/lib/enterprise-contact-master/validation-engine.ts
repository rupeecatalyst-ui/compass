/**
 * ECM validation — supports Progressive Contact Creation (non-blocking journey).
 */

import type { EcmContact, EcmContactRole, EcmValidationResult } from "@/types/enterprise-contact-master";
import type { ProgressiveParticipantKind } from "./progressive-contact";
import { progressiveRequiresMobile } from "./progressive-contact";

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
  opts?: {
    /** Progressive create from Loan Journey — relaxed rules by participant kind. */
    progressiveKind?: ProgressiveParticipantKind;
  },
): EcmValidationResult {
  const issues = [];
  if (!contact.name?.trim()) issues.push(issue("ECM_MISSING_NAME", "Contact name is required."));

  const progressive = Boolean(opts?.progressiveKind);
  const needMobile =
    !progressive || progressiveRequiresMobile(opts!.progressiveKind!);

  if (needMobile && !contact.mobilePrimary?.trim()) {
    issues.push(issue("ECM_MISSING_MOBILE", "Primary mobile is required."));
  } else if (
    needMobile &&
    contact.mobilePrimary &&
    contact.mobilePrimary.replace(/\D/g, "").length < 10
  ) {
    issues.push(issue("ECM_INVALID_MOBILE", "Mobile number must be at least 10 digits."));
  }

  if (!progressive) {
    const hasRoles = Boolean(contact.roles?.length || contact.primaryRole);
    if (!hasRoles) issues.push(issue("ECM_MISSING_ROLE", "At least one role is required."));
  }

  return { valid: issues.filter((i) => i.severity === "error").length === 0, issues };
}
