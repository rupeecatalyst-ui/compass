/**
 * Other Documents — custom named entries per loan file (UI persistence).
 * Does not modify the EDIE predefined checklist.
 */

import { OTHER_DOCUMENTS_TYPE_PREFIX } from "@/lib/document-center/classify-upload";

const STORAGE_PREFIX = "catalyst.document-center.other-docs:";

export interface OtherDocumentEntry {
  id: string;
  typeRef: string;
  name: string;
  createdAt: string;
}

function storageKey(loanFileId: string): string {
  return `${STORAGE_PREFIX}${loanFileId}`;
}

export function loadOtherDocumentEntries(loanFileId: string): OtherDocumentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(loanFileId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OtherDocumentEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOtherDocumentEntries(
  loanFileId: string,
  entries: OtherDocumentEntry[],
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(loanFileId), JSON.stringify(entries));
}

export function createOtherDocumentEntry(name: string): OtherDocumentEntry {
  const id = crypto.randomUUID();
  return {
    id,
    typeRef: `${OTHER_DOCUMENTS_TYPE_PREFIX}${id}`,
    name: name.trim() || "Supporting Document",
    createdAt: new Date().toISOString(),
  };
}

export function isOtherDocumentTypeRef(typeRef: string): boolean {
  return typeRef.startsWith(OTHER_DOCUMENTS_TYPE_PREFIX);
}
