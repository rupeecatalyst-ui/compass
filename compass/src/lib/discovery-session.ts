/**
 * Browser session resume for COMPASS discovery answers.
 * Values are presentation-only; Catalyst One remains the persisted SSOT after patch.
 * Unconfirmed slider defaults are not stored as answers.
 */

import {
  isAuthoritativeNumeric,
  isDeclarableNumericKey,
  type DeclarableAnswerState,
} from "@/lib/declarable-journey-answers";

export type DiscoverySessionStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function storageKey(productCode: string): string {
  return `compass.discovery.answers.v1.${productCode}`;
}

const SENSITIVE_ANSWER_KEYS = new Set([
  "mobile",
  "otp",
  "otpVerified",
  "monthlyIncome",
  "existingEmi",
  "displayName",
  "personalEmail",
  "approxCibilScore",
  "annualTurnover",
  "outstandingLoanAmount",
  "fieldAnswers",
]);

export function persistDiscoveryAnswers(
  storage: DiscoverySessionStorage,
  productCode: string,
  answers: Record<string, unknown>,
): void {
  const collected = (answers as DeclarableAnswerState).collectedFacts;
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(answers)) {
    if (SENSITIVE_ANSWER_KEYS.has(key)) continue;
    if (
      isDeclarableNumericKey(key) &&
      !isAuthoritativeNumeric(key, typeof value === "number" ? value : null, collected)
    ) {
      continue;
    }
    safe[key] = value;
  }
  const loanAmount = typeof safe.loanAmount === "number" ? Math.round(safe.loanAmount) : null;
  storage.setItem(
    storageKey(productCode),
    JSON.stringify({
      ...safe,
      ...(loanAmount != null ? { loanAmount } : {}),
    }),
  );
}

export function restoreDiscoveryAnswers(
  storage: DiscoverySessionStorage,
  productCode: string,
): Record<string, unknown> | null {
  const raw = storage.getItem(storageKey(productCode));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return null;
    for (const key of SENSITIVE_ANSWER_KEYS) delete parsed[key];
    if (typeof parsed.loanAmount === "number") {
      parsed.loanAmount = Math.round(parsed.loanAmount);
    }
    return parsed;
  } catch {
    return null;
  }
}

export function persistDiscoveryLoanAmount(
  storage: DiscoverySessionStorage,
  productCode: string,
  amountRupees: number,
): void {
  const existing = restoreDiscoveryAnswers(storage, productCode) ?? {};
  persistDiscoveryAnswers(storage, productCode, { ...existing, loanAmount: Math.round(amountRupees) });
}

export function restoreDiscoveryLoanAmount(
  storage: DiscoverySessionStorage,
  productCode: string,
): number | null {
  const restored = restoreDiscoveryAnswers(storage, productCode);
  const amount = restored?.loanAmount;
  return typeof amount === "number" && Number.isInteger(amount) && amount > 0 ? amount : null;
}

function sessionKey(productCode: string): string {
  return `compass.discovery.session.v1.${productCode}`;
}

export function persistJourneyToken(
  storage: DiscoverySessionStorage,
  productCode: string,
  token: string,
): void {
  storage.setItem(sessionKey(productCode), JSON.stringify({ token }));
}

export function restoreJourneyToken(
  storage: DiscoverySessionStorage,
  productCode: string,
): string | null {
  const raw = storage.getItem(sessionKey(productCode));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { token?: unknown };
    return typeof parsed.token === "string" && parsed.token.trim() ? parsed.token : null;
  } catch {
    return null;
  }
}
