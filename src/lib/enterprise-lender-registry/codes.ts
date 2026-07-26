/**
 * CO-ARCH-004 — Immutable Lender Code allocator (LND000001…).
 * Codes never change after issue, even if the lender legal name changes.
 */

const LND_PATTERN = /^LND(\d{6})$/;

export function formatLenderCode(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 999999) {
    throw new Error(`Lender code sequence out of range: ${sequence}`);
  }
  return `LND${String(sequence).padStart(6, "0")}`;
}

export function parseLenderCodeSequence(code: string): number | null {
  const match = LND_PATTERN.exec(code.trim().toUpperCase());
  if (!match) return null;
  return Number.parseInt(match[1], 10);
}

export function isImmutableLenderCode(code: string): boolean {
  return parseLenderCodeSequence(code) !== null;
}

/** Next LND sequence from existing codes (ignores non-LND legacy codes). */
export function nextLenderCodeSequence(existingCodes: string[]): number {
  let max = 0;
  for (const code of existingCodes) {
    const seq = parseLenderCodeSequence(code);
    if (seq !== null && seq > max) max = seq;
  }
  return max + 1;
}

export function allocateLenderCode(existingCodes: string[]): string {
  return formatLenderCode(nextLenderCodeSequence(existingCodes));
}
