import {
  ORG_DOC_DEFAULT_TEMPLATE_TYPES,
  ORG_DOC_SYSTEM_TYPES,
} from "@/constants/organization-documents";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { isTier2RegistryPortRuntimeActive } from "@/constants/enterprise-master-data/dual-read";
import {
  configureTier2RegistryPorts,
  getDocumentRegistryPort,
} from "@/lib/enterprise-tier2-ports";
import { organizationWorkspaceApi } from "@/lib/enterprise-organization-workspace";
import type { OrganizationDocumentDto } from "@/types/enterprise-organization-workspace";
import type {
  OrgDocCategoryId,
  OrgDocStatus,
  OrgDocTypeDefinition,
  OrgDocumentFilters,
  OrgDocumentRecord,
  OrgDocumentVersion,
} from "@/types/organization-documents";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const ORG_DOCUMENTS_PERSISTENCE_REQUIRED_MESSAGE =
  "Organization Documents require Enterprise persistence. Set ENTERPRISE_PERSISTENCE_MODE=prisma and apply the CO-ORG-001 migration.";

type RegistryCache = {
  documents: OrgDocumentRecord[];
  templateTypes: OrgDocTypeDefinition[];
  hydrated: boolean;
};

const cache: RegistryCache = {
  documents: [],
  templateTypes: ORG_DOC_DEFAULT_TEMPLATE_TYPES.map((t) => ({ ...t })),
  hydrated: false,
};

let hydratePromise: Promise<void> | null = null;

function assertPrismaMode(action: string) {
  if (!isEnterprisePersistencePrisma()) {
    throw new Error(`${ORG_DOCUMENTS_PERSISTENCE_REQUIRED_MESSAGE} (${action})`);
  }
}

function fileToBase64(file: File): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) {
    return Promise.reject(
      new Error(`File exceeds ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB upload limit`),
    );
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Failed to read file"));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function mapApiDocumentToRecord(doc: OrganizationDocumentDto): OrgDocumentRecord {
  const versions: OrgDocumentVersion[] = doc.versions.map((v) => ({
    id: v.id,
    version: v.version,
    originalFilename: v.originalFilename,
    fileSizeBytes: v.fileSizeBytes,
    mimeType: v.mimeType,
    contentDataUrl: null,
    uploadedBy: v.uploadedBy,
    uploadedAt: v.uploadedAt,
  }));

  return {
    id: doc.id,
    originalFilename: doc.originalFilename,
    categoryId: doc.categoryId,
    documentTypeId: doc.documentTypeId,
    documentTypeLabel: doc.documentTypeLabel,
    uploadedBy: doc.uploadedBy,
    uploadedAt: doc.uploadedAt,
    updatedAt: doc.updatedAt,
    version: doc.versionNumber,
    fileSizeBytes: doc.fileSizeBytes,
    mimeType: doc.mimeType,
    status: doc.status,
    tags: doc.tags,
    versions,
    contentDataUrl: doc.hasContent
      ? organizationWorkspaceApi.fetchDocumentContentUrl(doc.id)
      : null,
    extensions: {},
  };
}

function mapTemplateTypeToDefinition(
  t: Awaited<ReturnType<typeof organizationWorkspaceApi.listTemplateTypes>>[number],
): OrgDocTypeDefinition {
  return {
    id: t.id,
    categoryId: "templates",
    label: t.label,
    sortOrder: t.sortOrder,
    system: false,
  };
}

export async function hydrateOrgDocumentsRegistry(force = false): Promise<void> {
  assertPrismaMode("hydrate");
  if (cache.hydrated && !force) return;
  if (hydratePromise && !force) {
    await hydratePromise;
    return;
  }

  hydratePromise = (async () => {
    const [documents, templateTypes] = await Promise.all([
      organizationWorkspaceApi.listDocuments(),
      organizationWorkspaceApi.listTemplateTypes(),
    ]);
    cache.documents = documents.map(mapApiDocumentToRecord);
    cache.templateTypes =
      templateTypes.length > 0
        ? templateTypes.map(mapTemplateTypeToDefinition)
        : ORG_DOC_DEFAULT_TEMPLATE_TYPES.map((t) => ({ ...t }));
    cache.hydrated = true;
  })();

  try {
    await hydratePromise;
  } finally {
    hydratePromise = null;
  }
}

if (typeof window !== "undefined" && isEnterprisePersistencePrisma()) {
  void hydrateOrgDocumentsRegistry().catch(() => {
    // UI surfaces errors on mutation; initial hydrate may fail before auth is ready.
  });
}

export function listOrgDocumentTypes(
  categoryId: OrgDocCategoryId,
  templateTypes?: OrgDocTypeDefinition[],
): OrgDocTypeDefinition[] {
  if (categoryId === "templates") {
    const types = templateTypes ?? cache.templateTypes;
    return [...types].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  if (isTier2RegistryPortRuntimeActive()) {
    configureTier2RegistryPorts();
    const fromPort = getDocumentRegistryPort()
      .listDefinitions(categoryId)
      .filter((d) => d.enabled !== false)
      .map((d) => ({
        id: d.id,
        categoryId,
        label: d.label,
        sortOrder: d.sortOrder ?? 0,
        system: true as const,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    if (fromPort.length > 0) return fromPort;
  }

  return ORG_DOC_SYSTEM_TYPES.filter((t) => t.categoryId === categoryId).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

export function listAllOrgDocumentTypes(
  templateTypes?: OrgDocTypeDefinition[],
): OrgDocTypeDefinition[] {
  const templates = templateTypes ?? cache.templateTypes;

  if (isTier2RegistryPortRuntimeActive()) {
    configureTier2RegistryPorts();
    const port = getDocumentRegistryPort();
    const systemFromPort = port
      .listTypes()
      .filter((t) => t.id !== "templates" && t.enabled !== false)
      .flatMap((type) =>
        port.listDefinitions(type.id).map((d) => ({
          id: d.id,
          categoryId: type.id as OrgDocCategoryId,
          label: d.label,
          sortOrder: d.sortOrder ?? 0,
          system: true as const,
        })),
      );
    if (systemFromPort.length > 0) {
      return [...systemFromPort, ...templates].sort((a, b) => a.sortOrder - b.sortOrder);
    }
  }

  return [...ORG_DOC_SYSTEM_TYPES, ...templates].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getOrgDocuments(): OrgDocumentRecord[] {
  if (!isEnterprisePersistencePrisma()) return [];
  return cache.documents;
}

export function getOrgTemplateTypes(): OrgDocTypeDefinition[] {
  if (!isEnterprisePersistencePrisma()) return [];
  return [...cache.templateTypes].sort((a, b) => a.sortOrder - b.sortOrder);
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
  assertPrismaMode("upload");
  await hydrateOrgDocumentsRegistry(true);

  const files = await Promise.all(
    input.files.map(async (file) => ({
      originalFilename: file.name,
      contentBase64: await fileToBase64(file),
      mimeType: file.type || "application/octet-stream",
      fileSizeBytes: file.size,
    })),
  );

  const created = await organizationWorkspaceApi.uploadDocuments({
    files,
    categoryId: input.categoryId,
    documentTypeId: input.documentTypeId,
    documentTypeLabel: input.documentTypeLabel,
    tags: input.tags,
  });

  const records = created.map(mapApiDocumentToRecord);
  cache.documents = [...records, ...cache.documents];
  return records;
}

export async function replaceOrgDocument(
  documentId: string,
  file: File,
  uploadedBy: string,
): Promise<OrgDocumentRecord | null> {
  assertPrismaMode("replace");
  await hydrateOrgDocumentsRegistry(true);

  const contentBase64 = await fileToBase64(file);
  const updated = await organizationWorkspaceApi.patchDocument(documentId, {
    contentBase64,
    originalFilename: file.name,
    mimeType: file.type || "application/octet-stream",
    fileSizeBytes: file.size,
  });

  const record = mapApiDocumentToRecord(updated);
  cache.documents = cache.documents.map((d) => (d.id === documentId ? record : d));
  return record;
}

export function archiveOrgDocuments(ids: string[]): number {
  assertPrismaMode("archive");
  void organizationWorkspaceApi
    .archiveDocuments(ids)
    .then(async (n) => {
      await hydrateOrgDocumentsRegistry(true);
      return n;
    })
    .catch(() => undefined);

  const now = new Date().toISOString();
  let n = 0;
  cache.documents = cache.documents.map((d) => {
    if (!ids.includes(d.id) || d.status === "archived") return d;
    n += 1;
    return { ...d, status: "archived" as OrgDocStatus, updatedAt: now };
  });
  return n;
}

export function moveOrgDocumentsCategory(
  ids: string[],
  categoryId: OrgDocCategoryId,
  documentTypeId: string,
  documentTypeLabel: string,
): number {
  assertPrismaMode("move");
  void organizationWorkspaceApi
    .moveDocuments({ documentIds: ids, categoryId, documentTypeId, documentTypeLabel })
    .then(async () => hydrateOrgDocumentsRegistry(true))
    .catch(() => undefined);

  const now = new Date().toISOString();
  let n = 0;
  cache.documents = cache.documents.map((d) => {
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
  return n;
}

export function addOrgTemplateType(label: string): OrgDocTypeDefinition {
  assertPrismaMode("add template type");
  void organizationWorkspaceApi
    .createTemplateType(label)
    .then(async (created) => {
      cache.templateTypes.push(mapTemplateTypeToDefinition(created));
    })
    .catch(() => undefined);

  const maxOrder = cache.templateTypes.reduce((m, t) => Math.max(m, t.sortOrder), 0);
  const optimistic: OrgDocTypeDefinition = {
    id: `pending_${Date.now()}`,
    categoryId: "templates",
    label: label.trim(),
    sortOrder: maxOrder + 1,
    system: false,
  };
  cache.templateTypes.push(optimistic);
  return optimistic;
}

export function updateOrgTemplateType(id: string, label: string): OrgDocTypeDefinition | null {
  assertPrismaMode("update template type");
  void organizationWorkspaceApi.updateTemplateType(id, label).catch(() => undefined);

  const idx = cache.templateTypes.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  cache.templateTypes[idx] = { ...cache.templateTypes[idx]!, label: label.trim() };
  return cache.templateTypes[idx]!;
}

export function deleteOrgTemplateType(id: string): boolean {
  assertPrismaMode("delete template type");
  void organizationWorkspaceApi.deleteTemplateType(id).catch(() => undefined);

  const before = cache.templateTypes.length;
  cache.templateTypes = cache.templateTypes.filter((t) => t.id !== id);
  return cache.templateTypes.length < before;
}

export function reorderOrgTemplateTypes(orderedIds: string[]): OrgDocTypeDefinition[] {
  assertPrismaMode("reorder template types");
  void organizationWorkspaceApi.reorderTemplateTypes(orderedIds).then((next) => {
    cache.templateTypes = next.map(mapTemplateTypeToDefinition);
  });

  const byId = new Map(cache.templateTypes.map((t) => [t.id, t]));
  const next: OrgDocTypeDefinition[] = [];
  orderedIds.forEach((id, i) => {
    const t = byId.get(id);
    if (t) next.push({ ...t, sortOrder: i + 1 });
  });
  for (const t of cache.templateTypes) {
    if (!orderedIds.includes(t.id)) next.push({ ...t, sortOrder: next.length + 1 });
  }
  cache.templateTypes = next;
  return getOrgTemplateTypes();
}

export function buildOrgDocumentInternalLink(documentId: string): string {
  if (typeof window === "undefined") {
    return `/organization/documents?doc=${documentId}`;
  }
  return `${window.location.origin}/organization/documents?doc=${documentId}`;
}

export function isOrgDocumentsPersistenceActive(): boolean {
  return isEnterprisePersistencePrisma();
}
