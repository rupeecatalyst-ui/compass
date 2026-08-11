/**
 * CO-UX-021 — Enterprise Business Notes contracts.
 * Official business context notes — not a personal notepad.
 * AI-ready: projectable into Chanakya / SARATHI context later (no AI in this sprint).
 */

export type EnterpriseBusinessNoteCategory =
  | "general"
  | "customer_discussion"
  | "internal_discussion"
  | "lender_discussion"
  | "follow_up"
  | "risk"
  | "compliance"
  | "management";

export type EnterpriseBusinessNoteWorkspaceKind =
  | "opportunity"
  | "deal"
  | "lender_lifecycle"
  | "customer"
  | "accounting"
  | "other";

export type EnterpriseBusinessNoteEntityKind =
  | "opportunity"
  | "deal"
  | "contact"
  | "organization"
  | "other";

export type EnterpriseBusinessNoteModification = {
  at: string;
  byUserId: string;
  byName: string | null;
  previousBody: string;
  previousCategory: EnterpriseBusinessNoteCategory | string;
};

export type EnterpriseBusinessNote = {
  id: string;
  organizationId: string;
  body: string;
  category: EnterpriseBusinessNoteCategory | string;
  workspaceKind: EnterpriseBusinessNoteWorkspaceKind | string;
  entityKind: EnterpriseBusinessNoteEntityKind | string;
  entityId: string;
  opportunityId: string | null;
  dealId: string | null;
  contactId: string | null;
  lenderId: string | null;
  lenderName: string | null;
  isPinned: boolean;
  modificationHistory: EnterpriseBusinessNoteModification[];
  createdByUserId: string;
  createdByName: string | null;
  updatedByUserId: string | null;
  updatedByName: string | null;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  deletedAt: string | null;
};

export type CreateEnterpriseBusinessNoteInput = {
  body: string;
  category?: EnterpriseBusinessNoteCategory | string;
  workspaceKind: EnterpriseBusinessNoteWorkspaceKind | string;
  entityKind: EnterpriseBusinessNoteEntityKind | string;
  entityId: string;
  opportunityId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
  lenderId?: string | null;
  lenderName?: string | null;
  isPinned?: boolean;
};

export type UpdateEnterpriseBusinessNoteInput = {
  id: string;
  body?: string;
  category?: EnterpriseBusinessNoteCategory | string;
  isPinned?: boolean;
  softDelete?: boolean;
  deletionReason?: string | null;
};

export type ListEnterpriseBusinessNotesQuery = {
  entityKind?: string;
  entityId?: string;
  opportunityId?: string;
  dealId?: string;
  contactId?: string;
  q?: string;
  includeDeleted?: boolean;
  limit?: number;
};

/** Future Chanakya / SARATHI context slice — architecture only (CO-UX-021). */
export type EnterpriseBusinessNoteAiContextSlice = {
  noteId: string;
  body: string;
  category: string;
  workspaceKind: string;
  entityKind: string;
  entityId: string;
  opportunityId: string | null;
  dealId: string | null;
  contactId: string | null;
  lenderId: string | null;
  occurredAt: string;
  authorName: string | null;
};
