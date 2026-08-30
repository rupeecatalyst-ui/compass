/**
 * Browser session resume for COMPASS discovery answers.
 * Values are presentation-only; Catalyst One remains the persisted SSOT after patch.
 */

export type DiscoverySessionStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function storageKey(productCode: string): string {
  return `compass.discovery.answers.v1.${productCode}`;
}

export function persistDiscoveryAnswers(
  storage: DiscoverySessionStorage,
  productCode: string,
  answers: Record<string, unknown>,
): void {
  const loanAmount = typeof answers.loanAmount === "number" ? Math.round(answers.loanAmount) : null;
  storage.setItem(
    storageKey(productCode),
    JSON.stringify({
      ...answers,
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
