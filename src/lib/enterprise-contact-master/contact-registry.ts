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
  roles?: EcmContactRole[];
  primaryRole?: EcmContactRole;
  additionalRoles?: EcmContactRole[];
  ownerName?: string;
  ownerId?: string;
  status?: EcmContactStatus;
};

export function registerEcmContact(input: EcmContactRegisterInput): EcmContact {
  const roleFields = syncRoleFields(normalizeEcmAssignedRoles(input));
  const validation = validateEcmContact({
    name: input.name,
    mobilePrimary: input.mobilePrimary,
    roles: roleFields.roles,
    primaryRole: roleFields.primaryRole,
  });
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  const now = new Date().toISOString();
  const draft: EcmContact = {
    name: input.name.trim(),
    mobilePrimary: input.mobilePrimary.trim(),
    mobileSecondary: input.mobileSecondary?.trim() || undefined,
    personalEmail: input.personalEmail?.trim() || undefined,
    officialEmail: input.officialEmail?.trim() || undefined,
    ...roleFields,
    id: crypto.randomUUID(),
    enabled: true,
    status: input.status ?? "active",
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
    remarks: `ECM contact ${draft.name}`,
  });
  return draft;
}

/**
 * SSOT resolver: find by primary mobile (or id) or create.
 * Other modules must call this before attaching person roles.
 */
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
      | "roles"
      | "ownerName"
      | "ownerId"
      | "status"
      | "enabled"
      | "lastActiveOn"
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
    lastActiveOn: contact.lastActiveOn ?? contact.modifiedOn ?? contact.createdOn,
    contactScore: contact.contactScore ?? computeEcmContactScore({ ...contact, ...synced }),
  };
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

  if (status !== "all") {
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
