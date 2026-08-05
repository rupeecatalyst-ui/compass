/**
 * CO-360-001 — Document Registry projection helpers for 360 Workspaces.
 * Never duplicates binaries — Document Registry remains SSOT.
 */

import {
  filterDocumentRegistryRecords,
  getAllDocumentRegistryRecords,
} from "@/lib/document-registry";
import type { Enterprise360DocumentRef } from "@/types/enterprise-360-workspace";

export function listEnterprise360DocumentsForIdentity(input: {
  contactId?: string | null;
  customerId?: string | null;
  lenderId?: string | null;
}): Enterprise360DocumentRef[] {
  const all = getAllDocumentRegistryRecords();
  const filtered = filterDocumentRegistryRecords(all, {
    query: "",
    status: "all",
    typeRef: "all",
    uploadedBy: "all",
  }).filter((r) => {
    if (r.status === "deleted") return false;
    if (input.contactId && r.links.contactId === input.contactId) return true;
    if (input.customerId && r.links.customerId === input.customerId) return true;
    if (input.lenderId && r.links.lenderId === input.lenderId) return true;
    return false;
  });

  return filtered.map((r) => ({
    id: r.id,
    displayName: r.displayName,
    categoryLabel: r.categoryLabel,
    status: r.status,
    documentRegistryRecordId: r.id,
  }));
}
