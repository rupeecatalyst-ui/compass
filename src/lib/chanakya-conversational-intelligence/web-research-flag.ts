/**
 * CO-C1-CHANAKYA-CONVERSATIONAL-INTELLIGENCE-009
 * Phase 1: external web research is disabled in every environment.
 * The flag exists for a future controlled programme — never treat "unset" as on.
 */

import { CHANAKYA_PHASE1_WEB_RESEARCH_ENV } from "@/constants/chanakya-conversational-intelligence";

export function isChanakyaWebResearchEnabled(): boolean {
  const raw = process.env[CHANAKYA_PHASE1_WEB_RESEARCH_ENV];
  if (raw == null) return false;
  const v = raw.trim().toLowerCase();
  if (!v || v === "0" || v === "false" || v === "off" || v === "no") return false;
  // Even an explicit true stays off in Phase 1 — browsing is not implemented.
  return false;
}

export function chanakyaWebResearchIsImplemented(): false {
  return false;
}
