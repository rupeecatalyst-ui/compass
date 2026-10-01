/**
 * PAN_INDIA is the published nationwide state sentinel on Home Loan programmes.
 * Valid borrower states come from the existing ECM state catalog and region-master codes.
 */
import { ECM_MASTER_CATALOGS } from "@/constants/enterprise-contact-master/masters";
import { ENTERPRISE_REGION_MASTER } from "@/constants/enterprise-region-master";

export const PAN_INDIA_STATE_SENTINEL = "PAN_INDIA";

const STATE_CODES = new Map<string, string>();
const STATE_LABELS = new Map<string, string>();

for (const state of ECM_MASTER_CATALOGS.state) {
  if (state.id === "other") continue;
  const code = state.id.trim().toUpperCase();
  STATE_CODES.set(code, code);
  STATE_LABELS.set(state.label.trim().toLowerCase(), code);
}

for (const region of ENTERPRISE_REGION_MASTER) {
  for (const code of region.stateCodes) {
    const normalized = code.trim().toUpperCase();
    if (!STATE_CODES.has(normalized)) STATE_CODES.set(normalized, normalized);
  }
}

export function isPanIndiaStateSentinel(value: string | null | undefined): boolean {
  return value?.trim().toUpperCase() === PAN_INDIA_STATE_SENTINEL;
}

/** Known Indian state/UT code, or null when the value is not in the existing catalogs. */
export function canonicalIndianStateCode(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw || isPanIndiaStateSentinel(raw)) return null;
  const code = STATE_CODES.get(raw.toUpperCase());
  if (code) return code;
  return STATE_LABELS.get(raw.toLowerCase()) ?? null;
}

/**
 * Explicit state lists stay exact.
 * PAN_INDIA passes only when the applicant value is a known Indian state/UT.
 */
export function applicantStateMatchesProgramme(
  applicant: string,
  allowed: readonly string[],
): boolean {
  const explicit = allowed.filter((item) => !isPanIndiaStateSentinel(item));
  if (explicit.includes(applicant)) return true;
  if (allowed.some((item) => isPanIndiaStateSentinel(item))) {
    return canonicalIndianStateCode(applicant) != null;
  }
  return false;
}
