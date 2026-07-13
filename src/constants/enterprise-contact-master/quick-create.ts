/**
 * Quick Contact Creation Wizard — configuration (independent of Contact Workspace UI).
 */

export const ECM_QUICK_CREATE_EMPLOYMENT_OPTIONS = [
  { id: "salaried", label: "Salaried" },
  { id: "self-employed", label: "Self-Employed" },
  { id: "others", label: "Others" },
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
