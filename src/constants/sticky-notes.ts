/**
 * CO-C1-CATALYST-REFINEMENTS-016 — Sticky Notes workspace presentation.
 * Four blocks map to the existing EmployeePrivateStickyNote fields.
 * Not a second notes store.
 */

export const STICKY_NOTE_WORKSPACE_TITLE = "Sticky Notes" as const;

export const STICKY_NOTE_WORKSPACE_SUBTITLE =
  "Private personal workbench. Only you can see these notes — they never enter Contact 360, Activity & Dialogue, or shared transaction feeds." as const;

/** Approved spacious four-block editor — labels recovered from the existing note editor fields. */
export const STICKY_NOTE_WORKSPACE_BLOCKS = [
  {
    id: "title",
    label: "Title",
    field: "title",
  },
  {
    id: "body",
    label: "Private notes",
    field: "body",
  },
  {
    id: "checklist",
    label: "Checklist",
    field: "checklist",
  },
  {
    id: "reminder_link",
    label: "Reminder and related record",
    field: "reminderAt",
  },
] as const;

export type StickyNoteWorkspaceBlockId =
  (typeof STICKY_NOTE_WORKSPACE_BLOCKS)[number]["id"];
