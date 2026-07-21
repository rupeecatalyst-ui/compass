import type { EcmContactRole, EcmContactStatus } from "@/types/enterprise-contact-master";
import type { EcmContactQuery } from "@/types/enterprise-contact-master";
import { computeEcmContactScore } from "@/lib/enterprise-contact-master/contact-score";
import { normalizePersonName } from "@/lib/enterprise-contact-master/name-normalize";
import { ecmContactRepository } from "@server/repositories/ecm/contact.repository";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";

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

export class EcmContactService {
  async query(query: EcmContactQuery = {}) {
    const organizationId = await resolvePilotOrganizationId();
    return ecmContactRepository.query(organizationId, query);
  }

  async getById(id: string) {
    return ecmContactRepository.findById(id);
  }

  async register(input: RegisterContactInput) {
    const organizationId = await resolvePilotOrganizationId();
    const mobile = input.mobilePrimary.trim();
    if (!mobile) throw new Error("Mobile is required.");

    const duplicate = await ecmContactRepository.findByMobile(organizationId, mobile);
    if (duplicate) {
      throw new Error(`Contact with mobile ${mobile} already exists.`);
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

    return ecmContactRepository.create({ ...draft, contactScore: score });
  }

  async update(
    id: string,
    patch: Partial<RegisterContactInput> & {
      enabled?: boolean;
      status?: EcmContactStatus;
      strategicContact?: boolean;
    },
    actorId: string,
  ) {
    const existing = await ecmContactRepository.findById(id);
    if (!existing) throw new Error("Contact not found.");

    const organizationId = await resolvePilotOrganizationId();
    const nextMobile = patch.mobilePrimary?.trim() ?? existing.mobilePrimary;
    if (nextMobile !== existing.mobilePrimary) {
      const dup = await ecmContactRepository.findByMobile(organizationId, nextMobile);
      if (dup && dup.id !== id) throw new Error(`Mobile ${nextMobile} is already in use.`);
    }

    const roleFields = patch.roles || patch.primaryRole ? syncRoles({ ...existing, ...patch, createdBy: actorId }) : {
      roles: existing.roles,
      primaryRole: existing.primaryRole,
      additionalRoles: existing.additionalRoles,
    };

    const merged = {
      ...existing,
      ...patch,
      ...roleFields,
      name: patch.name ? normalizePersonName(patch.name) : existing.name,
      modifiedBy: actorId,
    };
    const contactScore = computeEcmContactScore(merged);

    return ecmContactRepository.update(id, {
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
      status: patch.status ?? existing.status,
      ownerName: patch.ownerName ?? existing.ownerName,
      ownerId: patch.ownerId ?? existing.ownerId,
      strategicContact: patch.strategicContact ?? existing.strategicContact,
      enabled: patch.enabled ?? existing.enabled,
      contactScore,
      modifiedBy: actorId,
    });
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
