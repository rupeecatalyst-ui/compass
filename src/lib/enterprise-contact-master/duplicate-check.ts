/**
 * Contact Registry — duplicate prevention (v1.0).
 * Only Mobile Number and Email Address. Future rules plug into this service.
 */

import type { EcmContact } from "@/types/enterprise-contact-master";
import { getEcmPorts } from "./composition";

export type EcmDuplicateMatchField = "mobile" | "email";

export type EcmDuplicateCheckInput = {
  mobile?: string | null;
  /** Any email being saved (personal or official). */
  email?: string | null;
  personalEmail?: string | null;
  officialEmail?: string | null;
  /** Exclude self on update. */
  excludeId?: string | null;
};

export type EcmDuplicateMatch = {
  contact: EcmContact;
  matchField: EcmDuplicateMatchField;
  message: string;
};

export class EcmDuplicateContactError extends Error {
  readonly code = "ECM_DUPLICATE_CONTACT" as const;
  readonly match: EcmContact;
  readonly matchField: EcmDuplicateMatchField;

  constructor(match: EcmDuplicateMatch) {
    super(match.message);
    this.name = "EcmDuplicateContactError";
    this.match = match.contact;
    this.matchField = match.matchField;
  }
}

export function isEcmDuplicateContactError(error: unknown): error is EcmDuplicateContactError {
  return error instanceof EcmDuplicateContactError;
}

export function normalizeEcmEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeMobileDigits(mobile: string): string {
  return mobile.replace(/\D/g, "");
}

function isUsableMobile(digits: string): boolean {
  return digits.length >= 10 && !digits.startsWith("pending");
}

function isUsableEmail(email: string): boolean {
  return email.includes("@") && email.length >= 5;
}

function contactEmails(c: EcmContact): string[] {
  return [c.personalEmail, c.officialEmail]
    .filter(Boolean)
    .map((e) => normalizeEcmEmail(e!))
    .filter(isUsableEmail);
}

function candidateEmails(input: EcmDuplicateCheckInput): string[] {
  const raw = [input.email, input.personalEmail, input.officialEmail]
    .filter(Boolean)
    .map((e) => normalizeEcmEmail(e!));
  return [...new Set(raw)].filter(isUsableEmail);
}

function listContacts(): EcmContact[] {
  return getEcmPorts().contacts.list();
}

export function findEcmContactByEmail(
  email: string,
  excludeId?: string | null,
): EcmContact | undefined {
  const normalized = normalizeEcmEmail(email);
  if (!isUsableEmail(normalized)) return undefined;
  return listContacts().find((c) => {
    if (excludeId && c.id === excludeId) return false;
    return contactEmails(c).includes(normalized);
  });
}

/**
 * v1.0 duplicate detection — mobile first, then email.
 * Extensible: add future fields to this function without changing call sites.
 */
export function checkEcmContactDuplicates(
  input: EcmDuplicateCheckInput,
): EcmDuplicateMatch | null {
  const excludeId = input.excludeId ?? null;
  const mobileDigits = input.mobile ? normalizeMobileDigits(input.mobile) : "";

  if (isUsableMobile(mobileDigits)) {
    const byMobile = listContacts().find((c) => {
      if (excludeId && c.id === excludeId) return false;
      if (c.mobilePrimary?.startsWith("pending-")) return false;
      return normalizeMobileDigits(c.mobilePrimary) === mobileDigits;
    });
    if (byMobile) {
      return {
        contact: byMobile,
        matchField: "mobile",
        message: "A contact with this mobile number already exists.",
      };
    }
  }

  for (const email of candidateEmails(input)) {
    const byEmail = findEcmContactByEmail(email, excludeId);
    if (byEmail) {
      return {
        contact: byEmail,
        matchField: "email",
        message: "A contact with this email address already exists.",
      };
    }
  }

  return null;
}

/** Throws EcmDuplicateContactError when a duplicate is found. */
export function assertNoEcmContactDuplicate(input: EcmDuplicateCheckInput): void {
  const match = checkEcmContactDuplicates(input);
  if (match) throw new EcmDuplicateContactError(match);
}
