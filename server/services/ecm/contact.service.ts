import type { EcmContactRole, EcmContactStatus } from "@/types/enterprise-contact-master";
import type {
  EcmContactIdentityLookupResult,
  EcmContactQuery,
} from "@/types/enterprise-contact-master";
import { computeEcmContactScore } from "@/lib/enterprise-contact-master/contact-score";
import { normalizePersonName } from "@/lib/enterprise-contact-master/name-normalize";
import { mergePartnerRoleOntoContact } from "@/lib/enterprise-identity-model";
import { ecmContactRepository } from "@server/repositories/ecm/contact.repository";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import {
  EcmContactActiveExistsError,
  EcmContactSoftDeletedError,
  toIdentitySnapshot,
} from "./contact-identity-errors";

export type RegisterContactInput = {
  name: string;
  mobilePrimary: string;
  createdBy: string;
  mobileSecondary?: string;
  personalEmail?: string;
  officialEmail?: string;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  pan?: string;
  aadhaar?: string;
  dateOfBirth?: string;
  employmentType?: string;
  roles?: EcmContactRole[];
  primaryRole?: EcmContactRole;
  roleProfiles?: Partial<Record<EcmContactRole, Record<string, string>>>;
  status?: EcmContactStatus;
  ownerName?: string;
  ownerId?: string;
  strategicContact?: boolean;
};

function syncRoles(input: RegisterContactInput) {
  const roles =
    input.roles?.length ? [...new Set(input.roles)] : input.primaryRole ? [input.primaryRole] : (["customer"] as EcmContactRole[]);
  return {
    roles,
    primaryRole: roles[0]!,
    additionalRoles: roles.slice(1),
  };
}

import { normalizeEcmMobile } from "@/lib/enterprise-contact-master";
import { ecmCanonicalMobilePrimary } from "@server/repositories/ecm/contact.repository";

function normalizeMobile(mobile: string): string {
  // SSOT: same digit strip as `normalizeEcmMobile` / Partner Gateway contact resolve.
  return ecmCanonicalMobilePrimary(mobile) || normalizeEcmMobile(mobile) || mobile.trim();
}

export class EcmContactService {
  async query(query: EcmContactQuery = {}) {
    const organizationId = await resolvePilotOrganizationId();
    return ecmContactRepository.query(organizationId, query);
  }

  async getById(id: string) {
    return ecmContactRepository.findById(id);
  }

  /**
   * CO-CONTACT-IDENTITY-001 — Search registry by mobile before create.
   * Active → open existing · Soft-deleted → restore · None → create.
   */
  async resolveIdentityByMobile(mobilePrimary: string): Promise<EcmContactIdentityLookupResult> {
    const organizationId = await resolvePilotOrganizationId();
    const mobile = normalizeMobile(mobilePrimary);
    if (!mobile) {
      return { status: "none" };
    }

    const identity = await ecmContactRepository.findIdentityByMobile(organizationId, mobile);
    if (!identity) return { status: "none" };

    if (identity.isDeleted) {
      return {
        status: "soft_deleted",
        contact: identity,
        snapshot: toIdentitySnapshot(identity),
      };
    }

    return {
      status: "active",
      contact: identity,
      snapshot: toIdentitySnapshot(identity),
    };
  }

  async register(input: RegisterContactInput) {
    const organizationId = await resolvePilotOrganizationId();
    const mobile = normalizeMobile(input.mobilePrimary);
    if (!mobile) throw new Error("Mobile is required.");

    // CO-CONTACT-IDENTITY-001 — never INSERT when any identity exists for this mobile.
    const identity = await ecmContactRepository.findIdentityByMobile(organizationId, mobile);
    if (identity) {
      if (identity.isDeleted) {
        throw new EcmContactSoftDeletedError(toIdentitySnapshot(identity));
      }
      throw new EcmContactActiveExistsError(toIdentitySnapshot(identity));
    }

    const roleFields = syncRoles(input);
    const draft = {
      organizationId,
      name: normalizePersonName(input.name),
      mobilePrimary: mobile,
      mobileSecondary: input.mobileSecondary?.trim() || undefined,
      personalEmail: input.personalEmail?.trim() || undefined,
      officialEmail: input.officialEmail?.trim() || undefined,
      city: input.city?.trim(),
      state: input.state?.trim(),
      country: input.country?.trim(),
      address: input.address?.trim(),
      pan: input.pan?.trim(),
      aadhaar: input.aadhaar?.trim(),
      dateOfBirth: input.dateOfBirth?.trim(),
      employmentType: input.employmentType?.trim(),
      ...roleFields,
      roleProfiles: input.roleProfiles,
      status: input.status ?? "provisional",
      ownerName: input.ownerName,
      ownerId: input.ownerId,
      strategicContact: input.strategicContact ?? false,
      createdBy: input.createdBy,
      modifiedBy: input.createdBy,
    };

    const score = computeEcmContactScore({
      personalEmail: draft.personalEmail,
      officialEmail: draft.officialEmail,
      mobileSecondary: draft.mobileSecondary,
      roles: roleFields.roles,
      primaryRole: roleFields.primaryRole,
      additionalRoles: roleFields.additionalRoles,
      status: draft.status,
    });

    try {
      return await ecmContactRepository.create({ ...draft, contactScore: score });
    } catch (err) {
      // Safety net: unique constraint race / unexpected soft-deleted row.
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("P2002") || msg.toLowerCase().includes("unique")) {
        const again = await ecmContactRepository.findIdentityByMobile(organizationId, mobile);
        if (again?.isDeleted) {
          throw new EcmContactSoftDeletedError(toIdentitySnapshot(again));
        }
        if (again) {
          throw new EcmContactActiveExistsError(toIdentitySnapshot(again));
        }
        throw new EcmContactSoftDeletedError({
          contactId: "",
          name: "Existing Contact",
          mobilePrimary: mobile,
          status: "archived",
        });
      }
      throw err;
    }
  }

  async update(
    id: string,
    patch: Partial<RegisterContactInput> & {
      enabled?: boolean;
      status?: EcmContactStatus;
      strategicContact?: boolean;
      roleProfiles?: Partial<Record<EcmContactRole, Record<string, string>>>;
    },
    actorId: string,
  ) {
    const existing = await ecmContactRepository.findById(id);
    if (!existing) throw new Error("Contact not found.");

    const organizationId = await resolvePilotOrganizationId();
    const nextMobile = patch.mobilePrimary
      ? normalizeMobile(patch.mobilePrimary)
      : existing.mobilePrimary;
    if (nextMobile !== existing.mobilePrimary) {
      const identity = await ecmContactRepository.findIdentityByMobile(
        organizationId,
        nextMobile,
      );
      if (identity && identity.id !== id) {
        if (identity.isDeleted) {
          throw new EcmContactSoftDeletedError(toIdentitySnapshot(identity));
        }
        throw new EcmContactActiveExistsError(toIdentitySnapshot(identity));
      }
    }

    const roleFields = patch.roles || patch.primaryRole ? syncRoles({ ...existing, ...patch, createdBy: actorId }) : {
      roles: existing.roles,
      primaryRole: existing.primaryRole,
      additionalRoles: existing.additionalRoles,
    };

    const nextRoleProfiles =
      patch.roleProfiles !== undefined
        ? { ...(existing.roleProfiles ?? {}), ...patch.roleProfiles }
        : existing.roleProfiles;

    const merged = {
      ...existing,
      ...patch,
      ...roleFields,
      roleProfiles: nextRoleProfiles,
      name: patch.name ? normalizePersonName(patch.name) : existing.name,
      modifiedBy: actorId,
    };
    const contactScore = computeEcmContactScore(merged);

    const updated = await ecmContactRepository.update(id, {
      name: merged.name,
      mobilePrimary: nextMobile,
      mobileSecondary: patch.mobileSecondary?.trim(),
      personalEmail: patch.personalEmail?.trim(),
      officialEmail: patch.officialEmail?.trim(),
      city: patch.city?.trim(),
      state: patch.state?.trim(),
      country: patch.country?.trim(),
      address: patch.address?.trim(),
      pan: patch.pan?.trim(),
      aadhaar: patch.aadhaar?.trim(),
      dateOfBirth: patch.dateOfBirth?.trim(),
      employmentType: patch.employmentType?.trim(),
      primaryRole: roleFields.primaryRole,
      roles: roleFields.roles,
      additionalRoles: roleFields.additionalRoles,
      roleProfiles: nextRoleProfiles,
      status: patch.status ?? existing.status,
      ownerName: patch.ownerName ?? existing.ownerName,
      ownerId: patch.ownerId ?? existing.ownerId,
      strategicContact: patch.strategicContact ?? existing.strategicContact,
      enabled: patch.enabled ?? existing.enabled,
      contactScore,
      modifiedBy: actorId,
    });

    const { propagateContactIdentityToTransactions } = await import(
      "@server/services/ecm/contact-ssot-propagate"
    );
    await propagateContactIdentityToTransactions({
      organizationId,
      contactId: id,
      contact: {
        name: updated.name,
        mobilePrimary: updated.mobilePrimary,
        officialEmail: updated.officialEmail,
        personalEmail: updated.personalEmail,
        city: updated.city,
        state: updated.state,
      },
      modifiedBy: actorId,
    });

    return updated;
  }

  /**
   * CO-ID-001 — Additive partner role when Wealth Partner profile is created.
   * Never creates a second Contact identity.
   */
  async assignPartnerRoleForWealthPartner(input: {
    contactId: string;
    actorUserId: string;
    wealthPartnerId: string;
    wealthPartnerCode: string;
  }) {
    const existing = await ecmContactRepository.findById(input.contactId);
    if (!existing) return null;
    const merged = mergePartnerRoleOntoContact({
      existingRoles: existing.roles,
      existingProfiles: existing.roleProfiles,
      actorUserId: input.actorUserId,
      wealthPartnerId: input.wealthPartnerId,
      wealthPartnerCode: input.wealthPartnerCode,
    });
    return this.update(
      input.contactId,
      {
        roles: merged.roles,
        roleProfiles: merged.roleProfiles,
      },
      input.actorUserId,
    );
  }

  async archive(id: string, actorId: string) {
    const now = new Date();
    return ecmContactRepository.update(id, {
      status: "archived",
      enabled: false,
      archivedBy: actorId,
      archivedAt: now,
      isDeleted: true,
      deletedAt: now,
      deletedBy: actorId,
      modifiedBy: actorId,
    });
  }

  /** Service-layer status promotion: Provisional → Active → Complete → Verified */
  async promoteStatus(id: string, nextStatus: EcmContactStatus, actorId: string) {
    const order: EcmContactStatus[] = ["provisional", "active", "complete", "verified"];
    const existing = await ecmContactRepository.findById(id);
    if (!existing) throw new Error("Contact not found.");
    const currentIdx = order.indexOf(existing.status);
    const nextIdx = order.indexOf(nextStatus);
    if (nextIdx === -1 || nextIdx < currentIdx) {
      throw new Error(`Invalid status promotion: ${existing.status} → ${nextStatus}`);
    }
    return this.update(id, { status: nextStatus }, actorId);
  }
}

export const ecmContactService = new EcmContactService();
