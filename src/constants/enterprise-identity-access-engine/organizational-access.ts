/**
 * EIAE organizational scope (OSV) constants.
 */

import type { EiaeOrganizationalScopeDefinition } from "@/types/enterprise-identity-access-engine";

export const EIAE_ORG_SCOPE_LEVELS = {
  COMPANY: "company",
  BUSINESS_UNIT: "business_unit",
  REGION: "region",
  STATE: "state",
  CITY: "city",
  BRANCH: "branch",
  TEAM: "team",
  INDIVIDUAL: "individual",
} as const;

export const EIAE_DEFAULT_ORG_SCOPES: EiaeOrganizationalScopeDefinition[] = [
  { id: "eiae-scope-company", scopeLevel: "company", scopeCode: "company_root", label: "Company", description: "Enterprise root scope.", enabled: true, sortOrder: 1 },
  { id: "eiae-scope-bu", scopeLevel: "business_unit", scopeCode: "business_unit", label: "Business Unit", description: "Business unit scope.", parentScopeRef: "company_root", enabled: true, sortOrder: 2 },
  { id: "eiae-scope-region", scopeLevel: "region", scopeCode: "region", label: "Region", description: "Regional scope.", parentScopeRef: "business_unit", enabled: true, sortOrder: 3 },
  { id: "eiae-scope-state", scopeLevel: "state", scopeCode: "state", label: "State", description: "State scope.", parentScopeRef: "region", enabled: true, sortOrder: 4 },
  { id: "eiae-scope-city", scopeLevel: "city", scopeCode: "city", label: "City", description: "City scope.", parentScopeRef: "state", enabled: true, sortOrder: 5 },
  { id: "eiae-scope-branch", scopeLevel: "branch", scopeCode: "branch", label: "Branch", description: "Branch scope.", parentScopeRef: "city", enabled: true, sortOrder: 6 },
  { id: "eiae-scope-team", scopeLevel: "team", scopeCode: "team", label: "Team", description: "Team scope.", parentScopeRef: "branch", enabled: true, sortOrder: 7 },
  { id: "eiae-scope-individual", scopeLevel: "individual", scopeCode: "individual", label: "Individual", description: "Individual scope.", parentScopeRef: "team", enabled: true, sortOrder: 8 },
];
