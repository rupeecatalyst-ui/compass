/**
 * CO-C1-CONTACT-STRATEGY-STICKY-NOTES-007
 * Private personal sticky notes — owner isolation is the privacy SSOT.
 */

export const STICKY_NOTES_SPRINT =
  "CO-C1-CONTACT-STRATEGY-STICKY-NOTES-007" as const;

export type StickyNoteColor =
  | "amber"
  | "teal"
  | "sky"
  | "rose"
  | "violet"
  | "lime";

export type StickyNotePriority = "low" | "normal" | "high";

export type StickyNoteLinkKind = "contact" | "company" | "opportunity" | "deal";

export type StickyNoteChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export type StickyNoteRecord = {
  id: string;
  organizationId: string;
  ownerUserId: string;
  title: string;
  body: string;
  color: StickyNoteColor;
  priority: StickyNotePriority;
  pinned: boolean;
  sortOrder: number;
  checklist: StickyNoteChecklistItem[];
  reminderAt: string | null;
  archivedAt: string | null;
  linkKind: StickyNoteLinkKind | null;
  linkId: string | null;
  linkLabel: string | null;
  convertedTaskId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type StickyNoteUpsertInput = {
  title?: string;
  body?: string;
  color?: StickyNoteColor;
  priority?: StickyNotePriority;
  pinned?: boolean;
  checklist?: StickyNoteChecklistItem[];
  reminderAt?: string | null;
  archived?: boolean;
  linkKind?: StickyNoteLinkKind | null;
  linkId?: string | null;
  linkLabel?: string | null;
};

export type StickyNoteListQuery = {
  q?: string;
  color?: StickyNoteColor | "all";
  priority?: StickyNotePriority | "all";
  pinned?: boolean | "all";
  archived?: boolean;
  linkKind?: StickyNoteLinkKind | "all";
};

export const STICKY_NOTE_CONVERT_CONFIRMATION =
  "The new Task will follow enterprise Task visibility. It will no longer be private like this note. The original sticky note stays in your private workbench.";
