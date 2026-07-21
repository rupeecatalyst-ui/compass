/**
 * CO-HOTFIX-006 — Operational company queries (Enterprise Registry SSOT).
 */

import type { EntityMasterOption } from "@/components/catalyst-one/shared/entity-master-search";
import { listEcmCompanies } from "@/lib/enterprise-company-master";
import type { EcmCompany } from "@/types/enterprise-company-master";

export interface EnterpriseCompanyOption extends EntityMasterOption {
  constitution?: string;
  pan?: string;
  gst?: string;
}

function isOperationalCompany(c: EcmCompany): boolean {
  return c.enabled !== false && c.status !== "archived";
}

export function toCompanyPickerOption(c: EcmCompany): EnterpriseCompanyOption {
  return {
    id: c.id,
    label: c.companyName,
    sublabel: c.constitution?.toUpperCase(),
    constitution: c.constitution?.toUpperCase(),
    pan: c.pan,
    gst: c.gst,
  };
}

export function listOperationalCompanies(): EnterpriseCompanyOption[] {
  return listEcmCompanies().filter(isOperationalCompany).map(toCompanyPickerOption);
}

export function findOperationalCompanyById(id: string): EcmCompany | undefined {
  const row = listEcmCompanies().find((c) => c.id === id);
  return row && isOperationalCompany(row) ? row : undefined;
}

/** Unified company search — same algorithm in every module. */
export function searchOperationalCompanies(query: string): EnterpriseCompanyOption[] {
  const q = query.trim().toLowerCase();
  const rows = listEcmCompanies().filter(isOperationalCompany);

  if (!q) return rows.map(toCompanyPickerOption);

  return rows
    .filter((c) => {
      const hay = [c.companyName, c.pan, c.gst, c.cin, c.industry, c.constitution]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    })
    .map(toCompanyPickerOption);
}
