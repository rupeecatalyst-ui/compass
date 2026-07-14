/**
 * Quick Contact Creation Wizard — step ids (aligned with UGJ contact_creation).
 * Employment options are sourced from the Employment Type master seed (CF-CON-035).
 * CF-CHANAKYA-008: conversational UX is driven by Universal Guided Journey.
 */

import { listEcmMasterOptions } from "./masters";

/** Prefer master catalog so Quick Create stays aligned with ECM configuration. */
export function getEcmQuickCreateEmploymentOptions() {
  return listEcmMasterOptions("employment_type");
}

/** @deprecated Use getEcmQuickCreateEmploymentOptions() — kept for type imports. */
export const ECM_QUICK_CREATE_EMPLOYMENT_OPTIONS = [
  { id: "salaried", label: "Salaried" },
  { id: "self-employed-professional", label: "Self-Employed Professional" },
  { id: "self-employed-business", label: "Self-Employed Business" },
  { id: "retired", label: "Retired" },
  { id: "homemaker", label: "Homemaker" },
  { id: "student", label: "Student" },
  { id: "other", label: "Other" },
] as const;

export type EcmQuickCreateEmploymentId =
  (typeof ECM_QUICK_CREATE_EMPLOYMENT_OPTIONS)[number]["id"];

export const ECM_QUICK_CREATE_STEPS = [
  { id: "name", label: "Name" },
  { id: "mobile", label: "Mobile" },
  { id: "employment", label: "Employment" },
  { id: "email", label: "Email" },
  { id: "roles", label: "Roles" },
  { id: "create", label: "Create" },
] as const;
