/**
 * CO-UX-021 — Client API for Enterprise Business Notes.
 */

import { ENTERPRISE_BUSINESS_NOTES_API } from "@/constants/enterprise-business-notes";
import {
  listSessionBusinessNotes,
  rememberBusinessNote,
  rememberBusinessNotes,
} from "@/lib/enterprise-business-notes/session-registry";
import type {
  CreateEnterpriseBusinessNoteInput,
  EnterpriseBusinessNote,
  ListEnterpriseBusinessNotesQuery,
  UpdateEnterpriseBusinessNoteInput,
} from "@/types/enterprise-business-notes";

function buildQuery(params: ListEnterpriseBusinessNotesQuery): string {
  const q = new URLSearchParams();
  if (params.entityKind) q.set("entityKind", params.entityKind);
  if (params.entityId) q.set("entityId", params.entityId);
  if (params.opportunityId) q.set("opportunityId", params.opportunityId);
  if (params.dealId) q.set("dealId", params.dealId);
  if (params.contactId) q.set("contactId", params.contactId);
  if (params.q) q.set("q", params.q);
  if (params.includeDeleted) q.set("includeDeleted", "1");
  if (params.limit != null) q.set("limit", String(params.limit));
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function listEnterpriseBusinessNotes(
  query: ListEnterpriseBusinessNotesQuery = {},
): Promise<EnterpriseBusinessNote[]> {
  try {
    const res = await fetch(`${ENTERPRISE_BUSINESS_NOTES_API}${buildQuery(query)}`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      return filterSession(query);
    }
    const payload = (await res.json()) as {
      data?: { items?: EnterpriseBusinessNote[] };
      items?: EnterpriseBusinessNote[];
    };
    const items = payload.data?.items ?? payload.items ?? [];
    if (items.length) rememberBusinessNotes(items);
    return items;
  } catch {
    return filterSession(query);
  }
}

function filterSession(query: ListEnterpriseBusinessNotesQuery): EnterpriseBusinessNote[] {
  let rows = listSessionBusinessNotes();
  if (query.entityKind && query.entityId) {
    rows = rows.filter(
      (n) => n.entityKind === query.entityKind && n.entityId === query.entityId,
    );
  }
  if (query.opportunityId) {
    rows = rows.filter((n) => n.opportunityId === query.opportunityId);
  }
  if (query.dealId) {
    rows = rows.filter((n) => n.dealId === query.dealId);
  }
  if (query.contactId) {
    rows = rows.filter((n) => n.contactId === query.contactId);
  }
  if (query.q?.trim()) {
    const needle = query.q.trim().toLowerCase();
    rows = rows.filter((n) => n.body.toLowerCase().includes(needle));
  }
  return rows.slice(0, query.limit ?? 100);
}

export async function createEnterpriseBusinessNote(
  input: CreateEnterpriseBusinessNoteInput,
): Promise<EnterpriseBusinessNote | null> {
  const provisional: EnterpriseBusinessNote = {
    id: crypto.randomUUID(),
    organizationId: "session",
    body: input.body.trim(),
    category: input.category ?? "general",
    workspaceKind: input.workspaceKind,
    entityKind: input.entityKind,
    entityId: input.entityId,
    opportunityId: input.opportunityId ?? null,
    dealId: input.dealId ?? null,
    contactId: input.contactId ?? null,
    lenderId: input.lenderId ?? null,
    lenderName: input.lenderName ?? null,
    isPinned: Boolean(input.isPinned),
    modificationHistory: [],
    createdByUserId: "session",
    createdByName: null,
    updatedByUserId: null,
    updatedByName: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDeleted: false,
    deletedAt: null,
  };
  rememberBusinessNote(provisional);

  try {
    const res = await fetch(ENTERPRISE_BUSINESS_NOTES_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    if (!res.ok) return provisional;
    const payload = (await res.json()) as {
      data?: { item?: EnterpriseBusinessNote };
      item?: EnterpriseBusinessNote;
    };
    const saved = payload.data?.item ?? payload.item;
    if (saved?.id) return rememberBusinessNote(saved);
  } catch {
    /* session remains */
  }
  return provisional;
}

export async function updateEnterpriseBusinessNote(
  input: UpdateEnterpriseBusinessNoteInput,
): Promise<EnterpriseBusinessNote | null> {
  try {
    const res = await fetch(ENTERPRISE_BUSINESS_NOTES_API, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as {
      data?: { item?: EnterpriseBusinessNote };
      item?: EnterpriseBusinessNote;
    };
    const saved = payload.data?.item ?? payload.item;
    if (saved?.id) return rememberBusinessNote(saved);
  } catch {
    /* ignore */
  }
  return null;
}

/** AI-ready projection helper — no Chanakya/SARATHI behaviour in this sprint. */
export function projectBusinessNotesForAiContext(
  notes: EnterpriseBusinessNote[],
): import("@/types/enterprise-business-notes").EnterpriseBusinessNoteAiContextSlice[] {
  return notes
    .filter((n) => !n.isDeleted)
    .map((n) => ({
      noteId: n.id,
      body: n.body,
      category: String(n.category),
      workspaceKind: String(n.workspaceKind),
      entityKind: String(n.entityKind),
      entityId: n.entityId,
      opportunityId: n.opportunityId,
      dealId: n.dealId,
      contactId: n.contactId,
      lenderId: n.lenderId,
      occurredAt: n.createdAt,
      authorName: n.createdByName,
    }));
}
