/**
 * Progressive Contact Creation — constitutional lifecycle helpers.
 */

import type { EcmContact, EcmContactLifecycleLabel, EcmContactStatus } from "@/types/enterprise-contact-master";

export const ECM_CONTACT_LIFECYCLE_LABELS: Record<EcmContactLifecycleLabel, string> = {
  provisional: "Provisional",
  complete: "Complete",
  verified: "Verified",
  archived: "Archived",
};

/** Usable throughout the Loan Journey (never blocked by provisional). */
export function isEcmContactUsable(status?: EcmContactStatus | null): boolean {
  if (!status) return true;
  return status !== "archived";
}

export function toEcmContactLifecycleLabel(
  status?: EcmContactStatus | null,
): EcmContactLifecycleLabel {
  if (status === "provisional") return "provisional";
  if (status === "verified") return "verified";
  if (status === "archived") return "archived";
  // active + complete → Complete
  return "complete";
}

export type ProgressiveParticipantKind =
  | "primary_applicant"
  | "co_applicant"
  | "guarantor"
  | "other";

export function progressiveRequiresMobile(kind: ProgressiveParticipantKind): boolean {
  return kind === "primary_applicant";
}

/** Gaps Chanakya monitors — advisory only, never blocking. */
export function listProvisionalContactGaps(contact: Pick<
  EcmContact,
  | "status"
  | "mobilePrimary"
  | "personalEmail"
  | "officialEmail"
  | "pan"
  | "aadhaar"
  | "address"
  | "city"
  | "dateOfBirth"
  | "employmentType"
>): string[] {
  const gaps: string[] = [];
  const mobile = (contact.mobilePrimary || "").replace(/\D/g, "");
  if (!mobile || mobile.length < 10 || mobile.startsWith("00000")) {
    gaps.push("Mobile Number");
  }
  if (!contact.personalEmail?.trim() && !contact.officialEmail?.trim()) {
    gaps.push("Email");
  }
  if (!contact.pan?.trim()) gaps.push("PAN");
  if (!contact.aadhaar?.trim()) gaps.push("Aadhaar / KYC");
  if (!contact.address?.trim() && !contact.city?.trim()) gaps.push("Address");
  if (!contact.dateOfBirth?.trim()) gaps.push("Date of Birth");
  if (!contact.employmentType?.trim()) gaps.push("Occupation");
  return gaps;
}

export function deriveContactStatusAfterSave(input: {
  progressive: boolean;
  kind: ProgressiveParticipantKind;
  mobilePrimary?: string;
  personalEmail?: string;
  pan?: string;
  address?: string;
}): EcmContactStatus {
  if (!input.progressive) return "complete";
  const gaps = listProvisionalContactGaps({
    status: "provisional",
    mobilePrimary: input.mobilePrimary || "",
    personalEmail: input.personalEmail,
    pan: input.pan,
    address: input.address,
  });
  // Primary with name+mobile only → still provisional until more identity lands
  if (input.kind === "primary_applicant" && gaps.length <= 4) return "provisional";
  if (gaps.length > 0) return "provisional";
  return "complete";
}
