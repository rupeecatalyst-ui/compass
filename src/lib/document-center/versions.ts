/**
 * Document Center version history — local UX store (does not change EDIE rules).
 */

export interface DocumentCenterVersion {
  id: string;
  typeRef: string;
  version: number;
  uploadedBy: string;
  uploadedAt: string;
  fileName: string;
  fileSizeLabel: string;
  mimeHint: "pdf" | "image" | "office" | "unknown";
  isCurrent: boolean;
  /** Simulated preview data URL or placeholder key. */
  previewKind: "pdf" | "image" | "office" | "unknown";
}

const KEY = "catalyst.document-center.versions";

export function loadDocumentVersions(
  fileId: string,
): Record<string, DocumentCenterVersion[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(`${KEY}:${fileId}`);
    return raw ? (JSON.parse(raw) as Record<string, DocumentCenterVersion[]>) : {};
  } catch {
    return {};
  }
}

export function saveDocumentVersions(
  fileId: string,
  map: Record<string, DocumentCenterVersion[]>,
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${KEY}:${fileId}`, JSON.stringify(map));
}

export function appendDocumentVersion(
  fileId: string,
  typeRef: string,
  uploadedBy: string,
  fileName?: string,
): DocumentCenterVersion[] {
  const all = loadDocumentVersions(fileId);
  const existing = (all[typeRef] ?? []).map((v) => ({ ...v, isCurrent: false }));
  const nextVersion: DocumentCenterVersion = {
    id: `ver-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    typeRef,
    version: existing.length + 1,
    uploadedBy: uploadedBy || "Relationship Manager",
    uploadedAt: new Date().toISOString(),
    fileName: fileName || `${typeRef.replace(/^doc:/, "")}-v${existing.length + 1}.pdf`,
    fileSizeLabel: `${(180 + existing.length * 12).toFixed(0)} KB`,
    mimeHint: "pdf",
    isCurrent: true,
    previewKind: "pdf",
  };
  const list = [...existing, nextVersion];
  all[typeRef] = list;
  saveDocumentVersions(fileId, all);
  return list;
}

export function reasonForDocument(item: {
  label: string;
  critical: boolean;
  mandatory: boolean;
  optional: boolean;
  criticalFromStage?: string;
  uploadMode?: string;
}): string {
  if (item.critical && item.criticalFromStage) {
    return `Required before ${item.criticalFromStage.replace(/_/g, " ")}.`;
  }
  if (item.critical) return "Critical for current workflow stage.";
  if (item.mandatory) return "Mandatory for document readiness and compliance.";
  if (item.optional) return "Optional — improves readiness but is not blocking.";
  if (item.uploadMode === "folder") return "Folder upload — add all related files here.";
  return `Required for ${item.label} completeness.`;
}
