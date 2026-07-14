/**
 * UX-02 / CF-CON-035 — Employment type master for loan origination.
 * Facade over Enterprise Contact Master seeds so loans stay aligned with ECM.
 */

import {
  getEcmMasterLabel,
  listEcmMasterOptions,
  normalizeEcmEmploymentTypeId,
} from "@/constants/enterprise-contact-master";

export const EMPLOYMENT_TYPES = listEcmMasterOptions("employment_type").map((o) => ({
  id: o.id,
  label: o.label,
}));

export type EmploymentTypeId = string;

export function normalizeEmploymentType(value?: string): EmploymentTypeId {
  return normalizeEcmEmploymentTypeId(value) ?? "other";
}

export function getEmploymentTypeLabel(id: EmploymentTypeId): string {
  return getEcmMasterLabel("employment_type", id) || "Other";
}

export function employmentTypeToLabel(id: EmploymentTypeId): string {
  return getEmploymentTypeLabel(id);
}
