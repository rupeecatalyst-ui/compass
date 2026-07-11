/**
 * EIAE persona registry seed.
 */

import { EIAE_IDENTITY_TYPES } from "./identity-types";
import type { EiaePersonaDefinition } from "@/types/enterprise-identity-access-engine";

export const EIAE_PERSONA_CODES = {
  SUPER_ADMIN: "super_admin",
  MANAGEMENT: "management",
  NATIONAL_HEAD: "national_head",
  REGIONAL_HEAD: "regional_head",
  STATE_HEAD: "state_head",
  CITY_HEAD: "city_head",
  BRANCH_MANAGER: "branch_manager",
  EMPLOYEE: "employee",
  CUSTOMER: "customer",
  WEALTH_PARTNER: "wealth_partner",
  BUILDER_PARTNER: "builder_partner",
  LENDER_EMPLOYEE: "lender_employee",
} as const;

export const EIAE_DEFAULT_PERSONAS: EiaePersonaDefinition[] = [
  { id: "eiae-persona-super-admin", personaCode: EIAE_PERSONA_CODES.SUPER_ADMIN, label: "Super Admin", description: "Platform super administrator.", applicableIdentityTypes: [EIAE_IDENTITY_TYPES.INTERNAL_USER], enabled: true, sortOrder: 1 },
  { id: "eiae-persona-management", personaCode: EIAE_PERSONA_CODES.MANAGEMENT, label: "Management", description: "Executive management persona.", applicableIdentityTypes: [EIAE_IDENTITY_TYPES.INTERNAL_USER, EIAE_IDENTITY_TYPES.EMPLOYEE], enabled: true, sortOrder: 2 },
  { id: "eiae-persona-national-head", personaCode: EIAE_PERSONA_CODES.NATIONAL_HEAD, label: "National Head", description: "National hierarchy leader.", applicableIdentityTypes: [EIAE_IDENTITY_TYPES.EMPLOYEE], enabled: true, sortOrder: 3 },
  { id: "eiae-persona-regional-head", personaCode: EIAE_PERSONA_CODES.REGIONAL_HEAD, label: "Regional Head", description: "Regional hierarchy leader.", applicableIdentityTypes: [EIAE_IDENTITY_TYPES.EMPLOYEE], enabled: true, sortOrder: 4 },
  { id: "eiae-persona-state-head", personaCode: EIAE_PERSONA_CODES.STATE_HEAD, label: "State Head", description: "State hierarchy leader.", applicableIdentityTypes: [EIAE_IDENTITY_TYPES.EMPLOYEE], enabled: true, sortOrder: 5 },
  { id: "eiae-persona-city-head", personaCode: EIAE_PERSONA_CODES.CITY_HEAD, label: "City Head", description: "City hierarchy leader.", applicableIdentityTypes: [EIAE_IDENTITY_TYPES.EMPLOYEE], enabled: true, sortOrder: 6 },
  { id: "eiae-persona-branch-manager", personaCode: EIAE_PERSONA_CODES.BRANCH_MANAGER, label: "Branch Manager", description: "Branch-level manager.", applicableIdentityTypes: [EIAE_IDENTITY_TYPES.EMPLOYEE], enabled: true, sortOrder: 7 },
  { id: "eiae-persona-employee", personaCode: EIAE_PERSONA_CODES.EMPLOYEE, label: "Employee", description: "Standard employee persona.", applicableIdentityTypes: [EIAE_IDENTITY_TYPES.EMPLOYEE, EIAE_IDENTITY_TYPES.INTERNAL_USER], enabled: true, sortOrder: 8 },
  { id: "eiae-persona-customer", personaCode: EIAE_PERSONA_CODES.CUSTOMER, label: "Customer", description: "Customer persona.", applicableIdentityTypes: [EIAE_IDENTITY_TYPES.CUSTOMER, EIAE_IDENTITY_TYPES.EXTERNAL_USER], enabled: true, sortOrder: 9 },
  { id: "eiae-persona-wealth-partner", personaCode: EIAE_PERSONA_CODES.WEALTH_PARTNER, label: "Wealth Partner", description: "Wealth partner persona.", applicableIdentityTypes: [EIAE_IDENTITY_TYPES.WEALTH_PARTNER], enabled: true, sortOrder: 10 },
  { id: "eiae-persona-builder-partner", personaCode: EIAE_PERSONA_CODES.BUILDER_PARTNER, label: "Builder Partner", description: "Builder partner persona.", applicableIdentityTypes: [EIAE_IDENTITY_TYPES.BUILDER_PARTNER], enabled: true, sortOrder: 11 },
  { id: "eiae-persona-lender-employee", personaCode: EIAE_PERSONA_CODES.LENDER_EMPLOYEE, label: "Lender Employee", description: "Lender organization employee.", applicableIdentityTypes: [EIAE_IDENTITY_TYPES.LENDER_EMPLOYEE], enabled: true, sortOrder: 12 },
];
