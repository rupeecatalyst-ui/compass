import {
  ORG_DOC_DEFAULT_TEMPLATE_TYPES,
  ORG_DOC_STORAGE_KEY,
  ORG_DOC_SYSTEM_TYPES,
} from "@/constants/organization-documents";
import type {
  OrgDocCategoryId,
  OrgDocStatus,
  OrgDocTypeDefinition,
  OrgDocumentFilters,
  OrgDocumentRecord,
  OrgDocumentVersion,
  OrgDocumentsRegistrySnapshot,
} from "@/types/organization-documents";

const SCHEMA_VERSION = 1 as const;
const MAX_PERSIST_BYTES = 2.5 * 1024 * 1024; // keep localStorage safe for certification demos

function emptySnapshot(): OrgDocumentsRegistrySnapshot {
  return {
    documents: [],
    templateTypes: ORG_DOC_DEFAULT_TEMPLATE_TYPES.map((t) => ({ ...t })),
    schemaVersion: SCHEMA_VERSION,
  };
}

function readSnapshot(): OrgDocumentsRegistrySnapshot {
  if (typeof window === "undefined") return emptySnapshot();
  try {
    const raw = localStorage.getItem(ORG_DOC_STORAGE_KEY);
    if (!raw) return emptySnapshot();
    const parsed = JSON.parse(raw) as OrgDocumentsRegistrySnapshot;
    if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION) return emptySnapshot();
    return {
      documents: Array.isArray(parsed.documents) ? parsed.documents : [],
      templateTypes: Array.isArray(parsed.templateTypes)
        ? parsed.templateTypes
        : ORG_DOC_DEFAULT_TEMPLATE_TYPES.map((t) => ({ ...t })),
      schemaVersion: SCHEMA_VERSION,
    };
  } catch {
    return emptySnapshot();
  }
}

function writeSnapshot(next: OrgDocumentsRegistrySnapshot) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ORG_DOC_STORAGE_KEY, JSON.stringify(next));
}

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function fileToDataUrl(file: File): Promise<string | null> {
  if (file.size > MAX_PERSIST_BYTES) return Promise.resolve(null);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export function listOrgDocumentTypes(
  categoryId: OrgDocCategoryId,
  templateTypes?: OrgDocTypeDefinition[],
): OrgDocTypeDefinition[] {
  if (categoryId === "templates") {
    const types = templateTypes ?? readSnapshot().templateTypes;
    return [...types].sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return ORG_DOC_SYSTEM_TYPES.filter((t) => t.categoryId === categoryId).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

export function listAllOrgDocumentTypes(
  templateTypes?: OrgDocTypeDefinition[],
): OrgDocTypeDefinition[] {
  const templates = templateTypes ?? readSnapshot().templateTypes;
  return [...ORG_DOC_SYSTEM_TYPES, ...templates].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getOrgDocuments(): OrgDocumentRecord[] {
  return readSnapshot().documents;
}

export function getOrgTemplateTypes(): OrgDocTypeDefinition[] {
  return [...readSnapshot().templateTypes].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function filterOrgDocuments(
  docs: OrgDocumentRecord[],
  filters: OrgDocumentFilters,
): OrgDocumentRecord[] {
  const q = filters.query.trim().toLowerCase();
  return docs.filter((d) => {
    if (filters.status !== "all" && d.status !== filters.status) return false;
    if (filters.categoryId !== "all" && d.categoryId !== filters.categoryId) return false;
    if (filters.documentTypeId !== "all" && d.documentTypeId !== filters.documentTypeId) {
      return false;
    }
    if (filters.uploadedBy !== "all" && d.uploadedBy !== filters.uploadedBy) return false;
    if (filters.tag !== "all" && !d.tags.includes(filters.tag)) return false;
    if (!q) return true;
    const hay = [
      d.originalFilename,
      d.documentTypeLabel,
      d.categoryId,
      d.uploadedBy,
      ...d.tags,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export async function uploadOrgDocuments(input: {
  files: File[];
  categoryId: OrgDocCategoryId;
  documentTypeId: string;
  documentTypeLabel: string;
  uploadedBy: string;
  tags?: string[];
}): Promise<OrgDocumentRecord[]> {
  const snap = readSnapshot();
  const created: OrgDocumentRecord[] = [];
  const now = new Date().toISOString();

  for (const file of input.files) {
    const contentDataUrl = await fileToDataUrl(file);
    const version: OrgDocumentVersion = {
      id: newId("odv"),
      version: 1,
      originalFilename: file.name,
      fileSizeBytes: file.size,
      mimeType: file.type || "application/octet-stream",
      contentDataUrl,
      uploadedBy: input.uploadedBy,
      uploadedAt: now,
    };
    const record: OrgDocumentRecord = {
      id: newId("odoc"),
      originalFilename: file.name,
      categoryId: input.categoryId,
      documentTypeId: input.documentTypeId,
      documentTypeLabel: input.documentTypeLabel,
      uploadedBy: input.uploadedBy,
      uploadedAt: now,
      updatedAt: now,
      version: 1,
      fileSizeBytes: file.size,
      mimeType: file.type || "application/octet-stream",
      status: "active",
      tags: input.tags ?? [],
      versions: [version],
      contentDataUrl,
      extensions: {},
    };
    created.push(record);
    snap.documents.unshift(record);
  }

  writeSnapshot(snap);
  return created;
}

export async function replaceOrgDocument(
  documentId: string,
  file: File,
  uploadedBy: string,
): Promise<OrgDocumentRecord | null> {
  const snap = readSnapshot();
  const idx = snap.documents.findIndex((d) => d.id === documentId);
  if (idx < 0) return null;
  const current = snap.documents[idx]!;
  const now = new Date().toISOString();
  const nextVersion = current.version + 1;
  const contentDataUrl = await fileToDataUrl(file);
  const version: OrgDocumentVersion = {
    id: newId("odv"),
    version: nextVersion,
    originalFilename: file.name,
    fileSizeBytes: file.size,
    mimeType: file.type || "application/octet-stream",
    contentDataUrl,
    uploadedBy,
    uploadedAt: now,
  };
  const updated: OrgDocumentRecord = {
    ...current,
    originalFilename: file.name,
    fileSizeBytes: file.size,
    mimeType: file.type || "application/octet-stream",
    version: nextVersion,
    uploadedBy,
    updatedAt: now,
    contentDataUrl,
    versions: [version, ...current.versions],
    status: "active",
  };
  snap.documents[idx] = updated;
  writeSnapshot(snap);
  return updated;
}

export function archiveOrgDocuments(ids: string[]): number {
  const snap = readSnapshot();
  let n = 0;
  const now = new Date().toISOString();
  snap.documents = snap.documents.map((d) => {
    if (!ids.includes(d.id) || d.status === "archived") return d;
    n += 1;
    return { ...d, status: "archived" as OrgDocStatus, updatedAt: now };
  });
  writeSnapshot(snap);
  return n;
}

export function moveOrgDocumentsCategory(
  ids: string[],
  categoryId: OrgDocCategoryId,
  documentTypeId: string,
  documentTypeLabel: string,
): number {
  const snap = readSnapshot();
  let n = 0;
  const now = new Date().toISOString();
  snap.documents = snap.documents.map((d) => {
    if (!ids.includes(d.id)) return d;
    n += 1;
    return {
      ...d,
      categoryId,
      documentTypeId,
      documentTypeLabel,
      updatedAt: now,
    };
  });
  writeSnapshot(snap);
  return n;
}

export function addOrgTemplateType(label: string): OrgDocTypeDefinition {
  const snap = readSnapshot();
  const maxOrder = snap.templateTypes.reduce((m, t) => Math.max(m, t.sortOrder), 0);
  const type: OrgDocTypeDefinition = {
    id: newId("tpl"),
    categoryId: "templates",
    label: label.trim(),
    sortOrder: maxOrder + 1,
    system: false,
  };
  snap.templateTypes.push(type);
  writeSnapshot(snap);
  return type;
}

export function updateOrgTemplateType(id: string, label: string): OrgDocTypeDefinition | null {
  const snap = readSnapshot();
  const idx = snap.templateTypes.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  snap.templateTypes[idx] = { ...snap.templateTypes[idx]!, label: label.trim() };
  writeSnapshot(snap);
  return snap.templateTypes[idx]!;
}

export function deleteOrgTemplateType(id: string): boolean {
  const snap = readSnapshot();
  const before = snap.templateTypes.length;
  snap.templateTypes = snap.templateTypes.filter((t) => t.id !== id);
  writeSnapshot(snap);
  return snap.templateTypes.length < before;
}

export function reorderOrgTemplateTypes(orderedIds: string[]): OrgDocTypeDefinition[] {
  const snap = readSnapshot();
  const byId = new Map(snap.templateTypes.map((t) => [t.id, t]));
  const next: OrgDocTypeDefinition[] = [];
  orderedIds.forEach((id, i) => {
    const t = byId.get(id);
    if (t) next.push({ ...t, sortOrder: i + 1 });
  });
  // append any missing
  for (const t of snap.templateTypes) {
    if (!orderedIds.includes(t.id)) next.push({ ...t, sortOrder: next.length + 1 });
  }
  snap.templateTypes = next;
  writeSnapshot(snap);
  return getOrgTemplateTypes();
}

export function buildOrgDocumentInternalLink(documentId: string): string {
  if (typeof window === "undefined") {
    return `/organization/documents?doc=${documentId}`;
  }
  return `${window.location.origin}/organization/documents?doc=${documentId}`;
}
