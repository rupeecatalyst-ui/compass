/**
 * CO-C1-CONTACT-STRATEGY-STICKY-NOTES-007
 * Private-note owner isolation — organisation + authenticated user only.
 * Hierarchy, Admin, and Super Admin never inherit another employee's notes.
 */

export type StickyNoteOwnerScope = {
  organizationId: string;
  ownerUserId: string;
};

export function stickyNoteOwnerWhere(scope: StickyNoteOwnerScope): StickyNoteOwnerScope {
  const organizationId = scope.organizationId.trim();
  const ownerUserId = scope.ownerUserId.trim();
  if (!organizationId || !ownerUserId) {
    throw Object.assign(new Error("Sticky note owner scope is required."), {
      code: "STICKY_NOTE_SCOPE_REQUIRED",
      statusCode: 403,
    });
  }
  return { organizationId, ownerUserId };
}

export function actorOwnsStickyNote(input: {
  organizationId: string;
  ownerUserId: string;
  actorOrganizationId: string;
  actorUserId: string;
}): boolean {
  return (
    input.organizationId.trim() === input.actorOrganizationId.trim() &&
    input.ownerUserId.trim() === input.actorUserId.trim()
  );
}

export function rejectCrossUserStickyNoteAccess(input: {
  noteOwnerUserId: string;
  actorUserId: string;
  actorRole?: string | null;
}): void {
  void input.actorRole;
  if (input.noteOwnerUserId.trim() !== input.actorUserId.trim()) {
    throw Object.assign(new Error("Private sticky notes are visible only to their owner."), {
      code: "STICKY_NOTE_FORBIDDEN",
      statusCode: 404,
    });
  }
}

export function stickyNoteListQueryWhere(scope: StickyNoteOwnerScope) {
  const owned = stickyNoteOwnerWhere(scope);
  return {
    organizationId: owned.organizationId,
    ownerUserId: owned.ownerUserId,
  };
}

export function stickyNoteMustNotEnterSharedActivity(sourceSystem: string | null | undefined): boolean {
  const source = String(sourceSystem || "").toLowerCase();
  return source === "sticky_notes" || source === "private_sticky_note";
}
