/**
 * CO-ID-001 — Identity role projection helpers (no parallel identity store).
 */

import { ENTERPRISE_IDENTITY_BUSINESS_ROLES } from "@/constants/enterprise-identity-model";
import type { EcmContact, EcmContactRole } from "@/types/enterprise-contact-master";
import type { EcmCompanyRelationRole } from "@/types/enterprise-company-master";
import type {
  EnterpriseIdentityRoleAssignment,
} from "@/types/enterprise-identity-model";

export function deriveContactIdentityRoles(input: {
  contact: Pick<
    EcmContact,
    "roles" | "roleProfiles" | "createdBy" | "createdOn" | "modifiedBy" | "modifiedOn"
  >;
  hasWealthPartner?: boolean;
  wealthPartnerCreatedAt?: string | null;
  companyRelationRoles?: readonly EcmCompanyRelationRole[];
  guarantorFlag?: boolean;
}): EnterpriseIdentityRoleAssignment[] {
  const roles = new Set(input.contact.roles ?? []);
  const profiles = input.contact.roleProfiles ?? {};
  const companyRoles = new Set(input.companyRelationRoles ?? []);

  return ENTERPRISE_IDENTITY_BUSINESS_ROLES.map((def) => {
    if (def.source === "reserved") {
      return {
        roleId: def.id,
        label: def.label,
        status: "reserved" as const,
        assigned: false,
        assignedDate: null,
        assignedBy: null,
        detail: "Reserved for future Vendor Registry (extends Contact).",
        ecmRole: def.ecmRole,
      };
    }

    let assigned = false;
    let assignedDate: string | null = null;
    let assignedBy: string | null = null;
    let detail: string | null = null;

    if (def.ecmRole && roles.has(def.ecmRole)) {
      assigned = true;
      const profile = profiles[def.ecmRole] ?? {};
      assignedDate =
        profile.assignedAt ||
        profile.assignedDate ||
        input.contact.modifiedOn ||
        input.contact.createdOn ||
        null;
      assignedBy =
        profile.assignedBy ||
        input.contact.modifiedBy ||
        input.contact.createdBy ||
        null;
      if (def.id === "wealth_partner") {
        detail = profile.wealthPartnerCode
          ? `Wealth Partner ${profile.wealthPartnerCode}`
          : input.hasWealthPartner
            ? "Linked Wealth Partner profile"
            : "Partner role assigned";
        if (input.wealthPartnerCreatedAt) {
          assignedDate = input.wealthPartnerCreatedAt;
        }
      }
    }

    if (def.companyRelationRole && companyRoles.has(def.companyRelationRole)) {
      assigned = true;
      assignedDate = assignedDate || input.contact.modifiedOn || input.contact.createdOn;
      assignedBy = assignedBy || input.contact.modifiedBy || input.contact.createdBy;
      detail = `Company relation · ${def.companyRelationRole}`;
    }

    if (def.id === "guarantor" && input.guarantorFlag) {
      assigned = true;
      assignedDate = assignedDate || input.contact.modifiedOn || input.contact.createdOn;
      assignedBy = assignedBy || input.contact.modifiedBy || input.contact.createdBy;
      detail = "Guarantor participant on a loan journey";
    }

    // Wealth Partner display: prefer WP linkage even if partner role lagging
    if (def.id === "wealth_partner" && input.hasWealthPartner && !assigned) {
      assigned = true;
      assignedDate = input.wealthPartnerCreatedAt || input.contact.modifiedOn;
      assignedBy = input.contact.modifiedBy || input.contact.createdBy;
      detail = "Wealth Partner profile linked";
    }

    return {
      roleId: def.id,
      label: def.label,
      status: assigned ? ("assigned" as const) : ("not_assigned" as const),
      assigned,
      assignedDate,
      assignedBy,
      detail,
      ecmRole: def.ecmRole,
    };
  });
}

export function mergePartnerRoleOntoContact(input: {
  existingRoles: EcmContactRole[];
  existingProfiles?: Partial<Record<EcmContactRole, Record<string, string>>>;
  actorUserId: string;
  wealthPartnerId: string;
  wealthPartnerCode: string;
}): {
  roles: EcmContactRole[];
  roleProfiles: Partial<Record<EcmContactRole, Record<string, string>>>;
} {
  const roles = [...new Set([...input.existingRoles, "partner" as EcmContactRole])];
  const now = new Date().toISOString();
  const prev = input.existingProfiles?.partner ?? {};
  return {
    roles,
    roleProfiles: {
      ...(input.existingProfiles ?? {}),
      partner: {
        ...prev,
        assignedAt: prev.assignedAt || now,
        assignedBy: input.actorUserId,
        assignedReason: "wealth_partner_onboarding",
        wealthPartnerId: input.wealthPartnerId,
        wealthPartnerCode: input.wealthPartnerCode,
        channelType: prev.channelType || "Wealth Partner",
      },
    },
  };
}
