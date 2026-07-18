/**
 * ECM contact registry — Contact SSOT for every person entity.
 */

import type {
  EcmContact,
  EcmContactQuery,
  EcmContactQueryResult,
  EcmContactRole,
  EcmContactStatus,
  EcmMissingEmailPrompt,
} from "@/types/enterprise-contact-master";
import { computeEcmContactScore } from "./contact-score";
import { recordEcmAudit } from "./audit-integration";
import { getEcmPorts } from "./composition";
import { validateEcmContact } from "./validation-engine";
import { assertNoEcmContactDuplicate } from "./duplicate-check";
import {
  deriveContactStatusAfterSave,
  isEcmContactUsable,
  type ProgressiveParticipantKind,
} from "./progressive-contact";
import { notifyEcmContactRegistryChanged } from "./contact-change-bus";

export function normalizeEcmAssignedRoles(input: {
  roles?: EcmContactRole[];
  primaryRole?: EcmContactRole;
  additionalRoles?: EcmContactRole[];
}): EcmContactRole[] {
  if (input.roles?.length) {
    return [...new Set(input.roles)];
  }
  const legacy = [input.primaryRole, ...(input.additionalRoles ?? [])].filter(
    Boolean,
  ) as EcmContactRole[];
  return [...new Set(legacy)];
}

function syncRoleFields(roles: EcmContactRole[]): Pick<EcmContact, "roles" | "primaryRole" | "additionalRoles"> {
  const unique = [...new Set(roles)];
  if (unique.length === 0) {
    throw new Error("At least one role is required.");
  }
  return {
    roles: unique,
    primaryRole: unique[0]!,
    additionalRoles: unique.slice(1),
  };
}

export type EcmContactRegisterInput = {
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
  roleProfiles?: Partial<Record<EcmContactRole, Record<string, string>>>;
  primaryRole?: EcmContactRole;
  additionalRoles?: EcmContactRole[];
  ownerName?: string;
  ownerId?: string;
  status?: EcmContactStatus;
  /** Progressive Contact Creation from Loan Journey. */
  progressiveKind?: ProgressiveParticipantKind;
};

export function registerEcmContact(input: EcmContactRegisterInput): EcmContact {
  const rolesInput = input.progressiveKind
    ? { roles: input.roles?.length ? input.roles : (["customer"] as EcmContactRole[]) }
    : input;
  const roleFields = syncRoleFields(normalizeEcmAssignedRoles(rolesInput));
  const mobilePrimary = input.mobilePrimary?.trim() || "";
  const validation = validateEcmContact(
    {
      name: input.name,
      mobilePrimary,
      roles: roleFields.roles,
      primaryRole: roleFields.primaryRole,
    },
    { progressiveKind: input.progressiveKind },
  );
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  assertNoEcmContactDuplicate({
    mobile: mobilePrimary,
    personalEmail: input.personalEmail,
    officialEmail: input.officialEmail,
  });

  const now = new Date().toISOString();
  const status =
    input.status ??
    (input.progressiveKind
      ? deriveContactStatusAfterSave({
          progressive: true,
          kind: input.progressiveKind,
          mobilePrimary,
          personalEmail: input.personalEmail,
          pan: input.pan,
          address: input.address,
        })
      : "complete");

  const draft: EcmContact = {
    name: input.name.trim(),
    mobilePrimary: mobilePrimary || `pending-${crypto.randomUUID().slice(0, 8)}`,
    mobileSecondary: input.mobileSecondary?.trim() || undefined,
    personalEmail: input.personalEmail?.trim() || undefined,
    officialEmail: input.officialEmail?.trim() || undefined,
    city: input.city?.trim() || undefined,
    state: input.state?.trim() || undefined,
    country: input.country?.trim() || undefined,
    address: input.address?.trim() || undefined,
    pan: input.pan?.trim() || undefined,
    aadhaar: input.aadhaar?.trim() || undefined,
    dateOfBirth: input.dateOfBirth?.trim() || undefined,
    employmentType: input.employmentType?.trim() || undefined,
    roleProfiles: input.roleProfiles,
    ...roleFields,
    id: crypto.randomUUID(),
    enabled: true,
    status,
    platformAccess: "no_access",
    linkedUserId: null,
    ownerName: input.ownerName,
    ownerId: input.ownerId,
    contactScore: 0,
    lastActiveOn: now,
    createdBy: input.createdBy,
    createdOn: now,
    modifiedBy: input.createdBy,
    modifiedOn: now,
  };
  draft.contactScore = computeEcmContactScore(draft);

  getEcmPorts().contacts.save(draft);
  recordEcmAudit({
    entityId: draft.id,
    entityType: "contact",
    action: "created",
    actorId: input.createdBy,
    remarks:
      status === "provisional"
        ? `ECM provisional contact ${draft.name} (progressive create)`
        : `ECM contact ${draft.name}`,
  });
  notifyEcmContactRegistryChanged();
  return draft;
}

/**
 * Progressive Contact Creation — minimum viable contact for Loan Journey.
 * Primary Applicant: name + mobile. Co-applicant / guarantor / other: name only.
 */
export function registerProgressiveLoanContact(input: {
  name: string;
  mobilePrimary?: string;
  kind: ProgressiveParticipantKind;
  createdBy: string;
  ownerName?: string;
  personalEmail?: string;
}): EcmContact {
  return registerEcmContact({
    name: input.name,
    mobilePrimary: input.mobilePrimary?.trim() || "",
    personalEmail: input.personalEmail,
    createdBy: input.createdBy,
    ownerName: input.ownerName,
    roles: ["customer"],
    progressiveKind: input.kind,
    status: "provisional",
  });
}

/**
 * SSOT resolver: find by primary mobile (or id) or create.
 * Other modules must call this before attaching person roles.
 */
export function normalizeEcmMobile(mobile: string): string {
  return mobile.replace(/\D/g, "");
}

export function findEcmContactByMobile(mobile: string): EcmContact | undefined {
  const digits = normalizeEcmMobile(mobile);
  if (!digits || digits.length < 10) return undefined;
  return listEcmContacts().find((c) => {
    if (c.mobilePrimary?.startsWith("pending-")) return false;
    return normalizeEcmMobile(c.mobilePrimary) === digits;
  });
}

export function resolveOrCreateEcmContact(
  input: EcmContactRegisterInput & { id?: string },
): { contact: EcmContact; created: boolean } {
  const ports = getEcmPorts();
  if (input.id) {
    const byId = ports.contacts.findById(input.id);
    if (byId) return { contact: byId, created: false };
  }

  const mobile = input.mobilePrimary.trim();
  const existing = ports.contacts.list().find((c) => c.mobilePrimary === mobile);
  if (existing) {
    const incomingRoles = normalizeEcmAssignedRoles(input);
    const merged = [...new Set([...existing.roles, ...incomingRoles])];
    if (merged.length !== existing.roles.length) {
      return {
        contact: updateEcmContact(
          existing.id,
          { roles: merged },
          input.createdBy,
        ),
        created: false,
      };
    }
    return { contact: existing, created: false };
  }

  return { contact: registerEcmContact(input), created: true };
}

export function updateEcmContact(
  contactId: string,
  patch: Partial<
    Pick<
      EcmContact,
      | "name"
      | "mobilePrimary"
      | "mobileSecondary"
      | "personalEmail"
      | "officialEmail"
      | "city"
      | "state"
      | "country"
      | "address"
      | "pan"
      | "aadhaar"
      | "dateOfBirth"
      | "employmentType"
      | "roles"
      | "ownerName"
      | "ownerId"
      | "status"
      | "enabled"
      | "lastActiveOn"
      | "roleProfiles"
      | "platformAccess"
      | "linkedUserId"
      | "strategicContact"
    >
  >,
  actorId: string,
): EcmContact {
  const existing = getEcmPorts().contacts.findById(contactId);
  if (!existing) throw new Error(`ECM contact not found: ${contactId}`);

  const roles = patch.roles
    ? syncRoleFields(normalizeEcmAssignedRoles({ roles: patch.roles }))
    : {
        roles: existing.roles,
        primaryRole: existing.primaryRole,
        additionalRoles: existing.additionalRoles,
      };

  const nextMobile =
    patch.mobilePrimary !== undefined ? patch.mobilePrimary : existing.mobilePrimary;
  const nextPersonal =
    patch.personalEmail !== undefined ? patch.personalEmail || undefined : existing.personalEmail;
  const nextOfficial =
    patch.officialEmail !== undefined ? patch.officialEmail || undefined : existing.officialEmail;

  assertNoEcmContactDuplicate({
    mobile: nextMobile,
    personalEmail: nextPersonal,
    officialEmail: nextOfficial,
    excludeId: contactId,
  });

  const updated: EcmContact = {
    ...existing,
    ...patch,
    ...roles,
    mobileSecondary:
      patch.mobileSecondary !== undefined
        ? patch.mobileSecondary || undefined
        : existing.mobileSecondary,
    personalEmail:
      patch.personalEmail !== undefined ? patch.personalEmail || undefined : existing.personalEmail,
    officialEmail:
      patch.officialEmail !== undefined ? patch.officialEmail || undefined : existing.officialEmail,
    modifiedBy: actorId,
    modifiedOn: new Date().toISOString(),
    contactScore: 0,
  };
  updated.contactScore = computeEcmContactScore(updated);

  getEcmPorts().contacts.save(updated);
  recordEcmAudit({
    entityId: updated.id,
    entityType: "contact",
    action: "modified",
    actorId,
    remarks: "ECM contact updated",
  });
  notifyEcmContactRegistryChanged();
  return updated;
}

export function updateEcmContactEmails(
  contactId: string,
  emails: { personalEmail?: string; officialEmail?: string },
  actorId: string,
): EcmContact {
  return updateEcmContact(contactId, emails, actorId);
}

export function touchEcmContactActivity(contactId: string, actorId = "system"): EcmContact | undefined {
  const existing = getEcmPorts().contacts.findById(contactId);
  if (!existing) return undefined;
  return updateEcmContact(contactId, { lastActiveOn: new Date().toISOString() }, actorId);
}

export function archiveEcmContact(contactId: string, actorId: string): EcmContact {
  return updateEcmContact(contactId, { status: "archived", enabled: false }, actorId);
}

export function listEcmContacts(): EcmContact[] {
  return getEcmPorts().contacts.list().map(ensureContactShape);
}

function ensureContactShape(contact: EcmContact): EcmContact {
  const roles =
    contact.roles?.length > 0
      ? contact.roles
      : normalizeEcmAssignedRoles({
          primaryRole: contact.primaryRole,
          additionalRoles: contact.additionalRoles,
        });
  const synced = syncRoleFields(roles);
  return {
    ...contact,
    ...synced,
    status: contact.status ?? (contact.enabled === false ? "archived" : "active"),
    platformAccess: contact.platformAccess ?? "no_access",
    linkedUserId: contact.linkedUserId ?? null,
    lastActiveOn: contact.lastActiveOn ?? contact.modifiedOn ?? contact.createdOn,
    contactScore: contact.contactScore ?? computeEcmContactScore({ ...contact, ...synced }),
    strategicContact: Boolean(contact.strategicContact),
  };
}

export function getEcmContact(contactId: string): EcmContact | undefined {
  const raw = getEcmPorts().contacts.findById(contactId);
  return raw ? ensureContactShape(raw) : undefined;
}

/** Client-side query simulating server-side pagination (default: latest 100, newest first). */
export function queryEcmContacts(query: EcmContactQuery = {}): EcmContactQueryResult {
  const pageSize = query.pageSize ?? 100;
  const page = Math.max(1, query.page ?? 1);
  const sortBy = query.sortBy ?? "createdOn";
  const sortDir = query.sortDir ?? "desc";
  const search = query.search?.trim().toLowerCase() ?? "";
  const status = query.status ?? "all";

  let items = listEcmContacts();

  if (status === "active") {
    // "Active" = usable in business workflows (not archived). Includes complete / provisional / verified.
    items = items.filter((c) => isEcmContactUsable(c.status));
  } else if (status !== "all") {
    items = items.filter((c) => c.status === status);
  }
  if (query.roles?.length) {
    items = items.filter((c) => query.roles!.some((r) => c.roles.includes(r)));
  }
  if (search) {
    items = items.filter((c) => {
      const hay = [
        c.name,
        c.mobilePrimary,
        c.mobileSecondary,
        c.personalEmail,
        c.officialEmail,
        c.ownerName,
        ...c.roles,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(search);
    });
  }

  items = [...items].sort((a, b) => {
    const av = a[sortBy] ?? "";
    const bv = b[sortBy] ?? "";
    if (typeof av === "number" && typeof bv === "number") {
      return sortDir === "asc" ? av - bv : bv - av;
    }
    const cmp = String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  const total = items.length;
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
  };
}

export function promptEcmMissingEmail(contactId: string): EcmMissingEmailPrompt {
  const contact = getEcmPorts().contacts.findById(contactId);
  if (!contact) {
    return {
      contactId,
      warning: true,
      message: "Contact not found; email cannot be verified for operational workflow.",
    };
  }

  const hasEmail = Boolean(contact.personalEmail?.trim() || contact.officialEmail?.trim());
  if (hasEmail) {
    return {
      contactId,
      warning: false,
      message: "Contact has at least one email on file.",
    };
  }

  return {
    contactId,
    warning: true,
    message: "Email is missing for operational workflow. Add personalEmail or officialEmail before proceeding.",
  };
}

export function getEcmContactAssignedRoles(contact: EcmContact): EcmContactRole[] {
  return ensureContactShape(contact).roles;
}
