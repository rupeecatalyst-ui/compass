/**
 * CO-C1-DEALS-JOURNEY-001 — Resolve lender-side contact for a Deal row.
 * Never invents names — Unassigned when no enterprise field is present.
 */
import type { DealRegistryRow } from "@/types/deal-registry";

const LENDER_CONTACT_EXTENSION_KEYS = [
  "lenderContactName",
  "lenderEmployeeName",
  "bankRmName",
  "lenderRmName",
  "contactPersonName",
  "lenderOfficerName",
] as const;

export function resolveLenderDealContactName(row: DealRegistryRow): string {
  const ext = row.lendingExtension;
  if (ext && typeof ext === "object") {
    for (const key of LENDER_CONTACT_EXTENSION_KEYS) {
      const value = ext[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  if (row.creditExecutive?.trim() && row.creditExecutive.trim() !== "—") {
    return row.creditExecutive.trim();
  }
  return "Unassigned";
}

export function formatDealBusinessSource(row: DealRegistryRow): string {
  const source = row.source?.trim();
  const partner = row.channelPartner?.trim();
  if (source && source !== "—" && partner && partner !== "—") {
    return `${source} · ${partner}`;
  }
  if (source && source !== "—") return source;
  if (partner && partner !== "—") return partner;
  return "Not Specified";
}
