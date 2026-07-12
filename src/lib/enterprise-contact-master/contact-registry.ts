/**
 * ECM contact registry.
 */

import type { EcmContact, EcmMissingEmailPrompt } from "@/types/enterprise-contact-master";
import { recordEcmAudit } from "./audit-integration";
import { getEcmPorts } from "./composition";
import { validateEcmContact } from "./validation-engine";

export function registerEcmContact(
  input: Omit<EcmContact, "id" | "enabled" | "createdOn" | "modifiedBy" | "modifiedOn" | "additionalRoles"> & {
    additionalRoles?: EcmContact["additionalRoles"];
  },
): EcmContact {
  const validation = validateEcmContact(input);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  const now = new Date().toISOString();
  const contact: EcmContact = {
    ...input,
    additionalRoles: input.additionalRoles ?? [],
    id: crypto.randomUUID(),
    enabled: true,
    createdOn: now,
    modifiedBy: input.createdBy,
    modifiedOn: now,
  };

  getEcmPorts().contacts.save(contact);
  recordEcmAudit({
    entityId: contact.id,
    entityType: "contact",
    action: "created",
    actorId: input.createdBy,
    remarks: `ECM contact ${contact.name}`,
  });
  return contact;
}

export function updateEcmContactEmails(
  contactId: string,
  emails: { personalEmail?: string; officialEmail?: string },
  actorId: string,
): EcmContact {
  const existing = getEcmPorts().contacts.findById(contactId);
  if (!existing) throw new Error(`ECM contact not found: ${contactId}`);

  const updated: EcmContact = {
    ...existing,
    personalEmail: emails.personalEmail !== undefined ? emails.personalEmail : existing.personalEmail,
    officialEmail: emails.officialEmail !== undefined ? emails.officialEmail : existing.officialEmail,
    modifiedBy: actorId,
    modifiedOn: new Date().toISOString(),
  };

  getEcmPorts().contacts.save(updated);
  recordEcmAudit({
    entityId: updated.id,
    entityType: "contact",
    action: "modified",
    actorId,
    remarks: "ECM contact emails updated",
  });
  return updated;
}

export function listEcmContacts(): EcmContact[] {
  return getEcmPorts().contacts.list();
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
