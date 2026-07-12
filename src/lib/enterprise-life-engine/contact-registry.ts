/**
 * LIFE lender contact registry.
 */

import type { LifeLenderContact, LifeRecommendationHint } from "@/types/enterprise-life-engine";
import { recordLifeAudit } from "./audit-integration";
import { getLifePorts } from "./composition";
import { validateLifeLenderContact } from "./validation-engine";

export function registerLifeLenderContact(
  input: Omit<LifeLenderContact, "id" | "enabled" | "createdOn" | "modifiedBy" | "modifiedOn">,
): LifeLenderContact {
  const now = new Date().toISOString();
  const contact: LifeLenderContact = {
    ...input,
    id: crypto.randomUUID(),
    enabled: true,
    createdOn: now,
    modifiedBy: input.createdBy,
    modifiedOn: now,
  };

  const validation = validateLifeLenderContact(contact);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getLifePorts().contacts.save(contact);
  recordLifeAudit({
    entityId: contact.id,
    entityType: "lender_contact",
    action: "created",
    actorId: input.createdBy,
    remarks: `LIFE contact ${contact.contactCode}`,
  });
  return contact;
}

export function registerLifeRecommendationHint(
  input: Omit<LifeRecommendationHint, "id">,
): LifeRecommendationHint {
  const hint: LifeRecommendationHint = { ...input, id: crypto.randomUUID() };
  getLifePorts().recommendationHints.save(hint);
  return hint;
}

export function listLifeLenderExecutors(): LifeLenderContact[] {
  return getLifePorts().contacts.listLenderExecutors();
}
