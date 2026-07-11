/**
 * EDIE checklist registry — checklists, items, and requirements.
 */

import type {
  EdieChecklistItem,
  EdieDocumentChecklist,
  EdieDocumentRequirement,
} from "@/types/enterprise-document-intelligence-engine";
import { recordEdieAudit } from "./audit-integration";
import { getEdiePorts } from "./composition";
import { validateEdieChecklist } from "./validation-engine";

export function registerEdieChecklist(
  input: Omit<EdieDocumentChecklist, "id" | "createdOn">,
): EdieDocumentChecklist {
  const duplicate = getEdiePorts().checklists.findByCode(input.checklistCode);
  if (duplicate) throw new Error(`EDIE: checklist code "${input.checklistCode}" already exists.`);

  const checklist: EdieDocumentChecklist = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  const validation = validateEdieChecklist(checklist);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEdiePorts().checklists.save(checklist);
  recordEdieAudit({
    entityId: checklist.id,
    entityType: "checklist",
    action: "created",
    actorId: input.createdBy,
    remarks: `Registered checklist ${checklist.checklistCode}`,
  });

  return checklist;
}

export function addEdieChecklistItem(
  input: Omit<EdieChecklistItem, "id">,
): EdieChecklistItem {
  if (!getEdiePorts().checklists.findById(input.checklistId)) {
    throw new Error(`EDIE: checklist "${input.checklistId}" not found.`);
  }

  const item: EdieChecklistItem = { ...input, id: crypto.randomUUID() };
  getEdiePorts().checklistItems.save(item);
  return item;
}

export function registerEdieDocumentRequirement(
  input: Omit<EdieDocumentRequirement, "id" | "createdOn">,
): EdieDocumentRequirement {
  if (!getEdiePorts().checklists.findById(input.checklistId)) {
    throw new Error(`EDIE: checklist "${input.checklistId}" not found.`);
  }

  const requirement: EdieDocumentRequirement = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  getEdiePorts().requirements.save(requirement);
  return requirement;
}

export function fulfillEdieDocumentRequirement(
  requirementId: string,
  documentId: string,
): EdieDocumentRequirement | undefined {
  const requirement = getEdiePorts().requirements.list().find((r) => r.id === requirementId);
  if (!requirement) return undefined;

  const updated: EdieDocumentRequirement = {
    ...requirement,
    documentId,
    status: "fulfilled",
  };

  getEdiePorts().requirements.save(updated);
  return updated;
}

export function listEdieChecklists(): EdieDocumentChecklist[] {
  return getEdiePorts().checklists.list();
}

export function listEdieRequirementsBySubject(
  subjectEntityType: string,
  subjectEntityId: string,
): EdieDocumentRequirement[] {
  return getEdiePorts().requirements.listBySubject(subjectEntityType, subjectEntityId);
}
