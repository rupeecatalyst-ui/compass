/**
 * CO-ID-001 — Enterprise Identity Model types.
 */

import type { EcmContactRole } from "@/types/enterprise-contact-master";
import type { EcmCompanyRelationRole } from "@/types/enterprise-company-master";

export type EnterpriseIdentityBusinessRoleId =
  | "customer"
  | "wealth_partner"
  | "employee"
  | "vendor"
  | "lender_contact"
  | "guarantor"
  | "director"
  | "authorised_signatory";

export type EnterpriseIdentityRoleSource =
  | "ecm_role"
  | "company_relation"
  | "projection"
  | "reserved";

export interface EnterpriseIdentityBusinessRoleDefinition {
  id: EnterpriseIdentityBusinessRoleId;
  label: string;
  description: string;
  ecmRole: EcmContactRole | null;
  source: EnterpriseIdentityRoleSource;
  wealthPartnerLinked?: boolean;
  companyRelationRole?: EcmCompanyRelationRole;
}

export type EnterpriseIdentityRoleAssignmentStatus =
  | "assigned"
  | "not_assigned"
  | "reserved";

export interface EnterpriseIdentityRoleAssignment {
  roleId: EnterpriseIdentityBusinessRoleId;
  label: string;
  status: EnterpriseIdentityRoleAssignmentStatus;
  assigned: boolean;
  assignedDate: string | null;
  assignedBy: string | null;
  detail?: string | null;
  ecmRole?: EcmContactRole | null;
}
