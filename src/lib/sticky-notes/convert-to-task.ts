/**
 * CO-C1-CONTACT-STRATEGY-STICKY-NOTES-007
 * Convert-to-Task is explicit, confirmed, and idempotent. Note remains private.
 */

import { registerEteTask } from "@/lib/enterprise-task-engine";
import type { StickyNoteRecord } from "@/types/sticky-notes";
import { STICKY_NOTE_CONVERT_CONFIRMATION } from "@/types/sticky-notes";

export function convertStickyNoteRequiresConfirmation(confirm: unknown): boolean {
  return confirm === true;
}

export function stickyNoteConvertConfirmationCopy(): string {
  return STICKY_NOTE_CONVERT_CONFIRMATION;
}

export function convertStickyNoteToTaskIdempotent(input: {
  note: StickyNoteRecord;
  confirm: unknown;
  actorUserId: string;
  actorLabel: string;
}): { taskId: string; created: boolean; confirmationRequired?: boolean } {
  if (!convertStickyNoteRequiresConfirmation(input.confirm)) {
    return { taskId: "", created: false, confirmationRequired: true };
  }
  if (input.note.convertedTaskId?.trim()) {
    return { taskId: input.note.convertedTaskId.trim(), created: false };
  }

  const linkKind = input.note.linkKind;
  const linkId = input.note.linkId?.trim() || undefined;
  const task = registerEteTask({
    taskType: linkKind === "opportunity" || linkKind === "deal" ? "opportunity" : "independent",
    assigneeRef: `user:${input.actorUserId}`,
    createdBy: input.actorUserId,
    predefinedDescription: "Custom",
    title: input.note.title.trim() || "Follow-up",
    description: input.note.body.trim() || input.note.title.trim() || "Follow-up from private sticky note",
    contactId: linkKind === "contact" ? linkId : undefined,
    opportunityRef: linkKind === "opportunity" ? linkId : undefined,
    dealId: linkKind === "deal" ? linkId : undefined,
    entityKind:
      linkKind === "deal"
        ? "EnterpriseDeal"
        : linkKind === "opportunity"
          ? "Opportunity"
          : linkKind === "contact"
            ? "Customer"
            : "Customer",
    entityId: linkId || input.note.id,
    entityLabel: input.note.linkLabel || input.note.title,
    borrowerName: input.actorLabel,
    category: "general",
    priority: input.note.priority === "high" ? "high" : "medium",
    assignedByRef: `user:${input.actorUserId}`,
  });

  return { taskId: task.id, created: true };
}
