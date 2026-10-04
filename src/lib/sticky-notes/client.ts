/**
 * CO-C1-CONTACT-STRATEGY-STICKY-NOTES-007 — private sticky notes client.
 */

import { authenticatedJsonFetch } from "@/lib/api-client";
import type {
  StickyNoteListQuery,
  StickyNoteRecord,
  StickyNoteUpsertInput,
} from "@/types/sticky-notes";

function queryOf(query: StickyNoteListQuery): string {
  const q = new URLSearchParams();
  if (query.q) q.set("q", query.q);
  if (query.color && query.color !== "all") q.set("color", query.color);
  if (query.priority && query.priority !== "all") q.set("priority", query.priority);
  if (query.pinned === true) q.set("pinned", "1");
  if (query.archived) q.set("archived", "1");
  if (query.linkKind && query.linkKind !== "all") q.set("linkKind", query.linkKind);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function listStickyNotes(query: StickyNoteListQuery = {}): Promise<StickyNoteRecord[]> {
  const res = await authenticatedJsonFetch(`/api/sticky-notes${queryOf(query)}`, { cache: "no-store" });
  const json = (await res.json()) as { data?: { notes?: StickyNoteRecord[] }; error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message || "Unable to load sticky notes.");
  return json.data?.notes ?? [];
}

export async function createStickyNote(input: StickyNoteUpsertInput): Promise<StickyNoteRecord> {
  const res = await authenticatedJsonFetch("/api/sticky-notes", {
    method: "POST",
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as { data?: StickyNoteRecord; error?: { message?: string } };
  if (!res.ok || !json.data) throw new Error(json.error?.message || "Unable to create sticky note.");
  return json.data;
}

export async function updateStickyNote(
  noteId: string,
  input: StickyNoteUpsertInput,
): Promise<StickyNoteRecord> {
  const res = await authenticatedJsonFetch(`/api/sticky-notes/${encodeURIComponent(noteId)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as { data?: StickyNoteRecord; error?: { message?: string } };
  if (!res.ok || !json.data) throw new Error(json.error?.message || "Unable to update sticky note.");
  return json.data;
}

export async function archiveStickyNote(noteId: string, mode: "archive" | "delete" | "restore") {
  const res = await authenticatedJsonFetch(
    `/api/sticky-notes/${encodeURIComponent(noteId)}?mode=${mode}`,
    { method: "DELETE" },
  );
  const json = (await res.json()) as { data?: StickyNoteRecord; error?: { message?: string } };
  if (!res.ok || !json.data) throw new Error(json.error?.message || "Unable to update sticky note.");
  return json.data;
}

export async function reorderStickyNotes(orderedIds: string[]): Promise<void> {
  const res = await authenticatedJsonFetch("/api/sticky-notes/reorder", {
    method: "POST",
    body: JSON.stringify({ orderedIds }),
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(json.error?.message || "Unable to reorder sticky notes.");
  }
}

export async function convertStickyNoteToTask(
  noteId: string,
  confirm: boolean,
): Promise<{
  confirmationRequired?: boolean;
  confirmation?: string;
  note?: StickyNoteRecord;
  taskId?: string;
  created?: boolean;
}> {
  const res = await authenticatedJsonFetch(
    `/api/sticky-notes/${encodeURIComponent(noteId)}/convert-to-task`,
    { method: "POST", body: JSON.stringify({ confirm }) },
  );
  const json = (await res.json()) as {
    data?: {
      confirmationRequired?: boolean;
      confirmation?: string;
      note?: StickyNoteRecord;
      taskId?: string;
      created?: boolean;
    };
    error?: { message?: string };
  };
  if (!res.ok || !json.data) throw new Error(json.error?.message || "Unable to convert sticky note.");
  return json.data;
}
