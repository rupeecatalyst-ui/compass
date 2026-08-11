/**
 * CO-UX-021 — Session cache for Business Notes (Soft Go-Live + hydrate buffer).
 */

import type { EnterpriseBusinessNote } from "@/types/enterprise-business-notes";

const notes = new Map<string, EnterpriseBusinessNote>();
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

export function rememberBusinessNote(row: EnterpriseBusinessNote): EnterpriseBusinessNote {
  notes.set(row.id, row);
  notify();
  return row;
}

export function rememberBusinessNotes(rows: EnterpriseBusinessNote[]): void {
  for (const row of rows) notes.set(row.id, row);
  notify();
}

export function listSessionBusinessNotes(): EnterpriseBusinessNote[] {
  return [...notes.values()]
    .filter((n) => !n.isDeleted)
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export function subscribeBusinessNotesUpdated(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearSessionBusinessNotes(): void {
  notes.clear();
  notify();
}
