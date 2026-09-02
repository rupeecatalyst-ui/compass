/**
 * COMPASS customer identity — canonical full name, mobile, optional email.
 * Field names match Enterprise IDC (`displayName`) and ECM (`personalEmail`).
 */

import { isValidEmailAddress } from "@/lib/enterprise-communication-center/recipient-router";
import { normalizeEcmEmail } from "@/lib/enterprise-contact-master/duplicate-check";
import { normalizePersonName } from "@/lib/enterprise-contact-master/name-normalize";

function normalizeEcmMobile(mobile: string): string {
  return mobile.replace(/\D/g, "");
}

export const COMPASS_PLACEHOLDER_CONTACT_NAME = "COMPASS Prospect";
/** Matches ENTERPRISE_IDC_CUSTOMER_CAPTURE.displayName.validation */
export const COMPASS_DISPLAY_NAME_MIN = 2;
export const COMPASS_DISPLAY_NAME_MAX = 120;

export const COMPASS_CUSTOMER_IDENTITY_MESSAGES = {
  displayNameRequired: "Enter your full name.",
  displayNameTooShort: "Enter your full name (at least 2 characters).",
  displayNameTooLong: "Enter a shorter name (120 characters or fewer).",
  mobileRequired: "A valid mobile number is required.",
  emailInvalid: "Enter a valid email address.",
} as const;

export type CompassCustomerIdentity = {
  displayName: string;
  mobile: string;
  personalEmail: string | null;
};

export type CompassIdentityParseFailure = {
  ok: false;
  code: "INVALID_DISPLAY_NAME" | "INVALID_MOBILE" | "INVALID_EMAIL";
  message: string;
};

export type CompassIdentityParseSuccess = {
  ok: true;
  value: CompassCustomerIdentity;
};

export function isCompassPlaceholderName(name: string | null | undefined): boolean {
  return (name ?? "").trim().toLowerCase() === COMPASS_PLACEHOLDER_CONTACT_NAME.toLowerCase();
}

export function parseCompassDisplayName(
  raw: unknown,
): { ok: true; value: string } | { ok: false; message: string } {
  if (typeof raw !== "string") {
    return { ok: false, message: COMPASS_CUSTOMER_IDENTITY_MESSAGES.displayNameRequired };
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, message: COMPASS_CUSTOMER_IDENTITY_MESSAGES.displayNameRequired };
  }
  const normalized = normalizePersonName(trimmed);
  if (!normalized || isCompassPlaceholderName(normalized)) {
    return { ok: false, message: COMPASS_CUSTOMER_IDENTITY_MESSAGES.displayNameRequired };
  }
  if (normalized.length < COMPASS_DISPLAY_NAME_MIN) {
    return { ok: false, message: COMPASS_CUSTOMER_IDENTITY_MESSAGES.displayNameTooShort };
  }
  if (normalized.length > COMPASS_DISPLAY_NAME_MAX) {
    return { ok: false, message: COMPASS_CUSTOMER_IDENTITY_MESSAGES.displayNameTooLong };
  }
  return { ok: true, value: normalized };
}

export function parseCompassMobile(
  raw: unknown,
): { ok: true; value: string } | { ok: false; message: string } {
  if (raw == null || typeof raw !== "string") {
    return { ok: false, message: COMPASS_CUSTOMER_IDENTITY_MESSAGES.mobileRequired };
  }
  const mobile = normalizeEcmMobile(raw);
  if (!mobile || mobile.length < 10) {
    return { ok: false, message: COMPASS_CUSTOMER_IDENTITY_MESSAGES.mobileRequired };
  }
  return { ok: true, value: mobile };
}

export function parseCompassOptionalEmail(
  raw: unknown,
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (raw == null) return { ok: true, value: null };
  if (typeof raw !== "string") {
    return { ok: false, message: COMPASS_CUSTOMER_IDENTITY_MESSAGES.emailInvalid };
  }
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };
  if (!isValidEmailAddress(trimmed)) {
    return { ok: false, message: COMPASS_CUSTOMER_IDENTITY_MESSAGES.emailInvalid };
  }
  return { ok: true, value: normalizeEcmEmail(trimmed) };
}

export function parseCompassCustomerIdentity(input: {
  displayName?: unknown;
  mobile?: unknown;
  personalEmail?: unknown;
  email?: unknown;
}): CompassIdentityParseSuccess | CompassIdentityParseFailure {
  const name = parseCompassDisplayName(input.displayName);
  if (!name.ok) {
    return { ok: false, code: "INVALID_DISPLAY_NAME", message: name.message };
  }
  const mobile = parseCompassMobile(input.mobile);
  if (!mobile.ok) {
    return { ok: false, code: "INVALID_MOBILE", message: mobile.message };
  }
  const email = parseCompassOptionalEmail(input.personalEmail ?? input.email);
  if (!email.ok) {
    return { ok: false, code: "INVALID_EMAIL", message: email.message };
  }
  return {
    ok: true,
    value: {
      displayName: name.value,
      mobile: mobile.value,
      personalEmail: email.value,
    },
  };
}

/** Never overwrite a real Contact name with blank or a placeholder-only update. */
export function shouldPersistContactName(
  existingName: string | null | undefined,
  incomingName: string,
): boolean {
  if (!incomingName.trim()) return false;
  const existing = (existingName ?? "").trim();
  return !existing || isCompassPlaceholderName(existing);
}

/** Never overwrite a stored email with blank; never replace a non-empty email. */
export function shouldPersistPersonalEmail(
  existingEmail: string | null | undefined,
  incomingEmail: string | null,
): boolean {
  if (!incomingEmail) return false;
  return !(existingEmail ?? "").trim();
}

export function mergeResumedContactIdentity(
  existing: { name?: string | null; personalEmail?: string | null },
  incoming: CompassCustomerIdentity,
): {
  name: string;
  personalEmail: string | null;
  nameChanged: boolean;
  emailChanged: boolean;
} {
  const nameChanged = shouldPersistContactName(existing.name, incoming.displayName);
  const name = nameChanged ? incoming.displayName : existing.name?.trim() || incoming.displayName;
  const emailChanged = shouldPersistPersonalEmail(existing.personalEmail, incoming.personalEmail);
  const existingEmail = existing.personalEmail?.trim() || null;
  const personalEmail = emailChanged ? incoming.personalEmail : existingEmail || incoming.personalEmail;
  return { name, personalEmail, nameChanged, emailChanged };
}
