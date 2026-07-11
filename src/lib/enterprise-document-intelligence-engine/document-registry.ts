/**
 * EDIE document registry — registration, versioning, lifecycle.
 */

import {
  EDIE_DOCUMENT_CATEGORIES,
  EDIE_DOCUMENT_CLASSIFICATIONS,
  EDIE_DOCUMENT_LIFECYCLE_ACTION_MAP,
  EDIE_DOCUMENT_LIFECYCLE_STATUS,
} from "@/constants/enterprise-document-intelligence-engine";
import type {
  EdieDocumentLifecycleAction,
  EdieDocumentLifecycleStatus,
  EdieDocumentMasterRecord,
  EdieDocumentOwnerReference,
  EdieDocumentProfile,
  EdieDocumentRevision,
  EdieDocumentSubjectReference,
  EdieDocumentTag,
  EdieDocumentType,
  EdieDocumentVersion,
  EdieEnterpriseDocumentId,
} from "@/types/enterprise-document-intelligence-engine";
import { recordEdieAudit } from "./audit-integration";
import { getEdiePorts } from "./composition";
import { appendEdieTimelineEntry } from "./timeline-registry";
import {
  validateEdieDocument,
  validateEdieDocumentLifecycleTransition,
  validateEdieDocumentVersion,
} from "./validation-engine";

type RegisterDocumentInput = {
  documentCode: string;
  documentTypeCode: string;
  documentName: string;
  description: string;
  category?: EdieDocumentMasterRecord["category"];
  classification?: EdieDocumentMasterRecord["classification"];
  tenantId?: string;
  tags?: EdieDocumentTag[];
  createdBy: string;
};

export function registerEdieDocumentType(
  input: Omit<EdieDocumentType, "id" | "createdOn">,
): EdieDocumentType {
  const duplicate = getEdiePorts().documentTypes.findByCode(input.typeCode);
  if (duplicate) throw new Error(`EDIE: document type "${input.typeCode}" already exists.`);

  const type: EdieDocumentType = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  getEdiePorts().documentTypes.save(type);
  return type;
}

export function registerEdieDocument(input: RegisterDocumentInput): EdieDocumentMasterRecord {
  const now = new Date().toISOString();
  const enterpriseDocId: EdieEnterpriseDocumentId = {
    id: crypto.randomUUID(),
    documentCode: input.documentCode,
    createdOn: now,
  };
  getEdiePorts().enterpriseDocumentIds.save(enterpriseDocId);

  const document: EdieDocumentMasterRecord = {
    id: crypto.randomUUID(),
    enterpriseDocumentId: enterpriseDocId.id,
    documentCode: input.documentCode,
    documentTypeCode: input.documentTypeCode,
    documentName: input.documentName,
    description: input.description,
    category: input.category ?? EDIE_DOCUMENT_CATEGORIES.GENERAL,
    classification: input.classification ?? EDIE_DOCUMENT_CLASSIFICATIONS.INTERNAL,
    lifecycleStatus: EDIE_DOCUMENT_LIFECYCLE_STATUS.DRAFT,
    currentRevisionNumber: 0,
    tags: input.tags ?? [],
    tenantId: input.tenantId,
    enabled: true,
    createdBy: input.createdBy,
    createdOn: now,
    modifiedBy: input.createdBy,
    modifiedOn: now,
  };

  const validation = validateEdieDocument(getEdiePorts().documents, document);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEdiePorts().documents.save(document);
  recordEdieAudit({
    entityId: document.id,
    entityType: "document",
    action: "created",
    actorId: input.createdBy,
    newStateRef: document.lifecycleStatus,
    remarks: `Registered document ${document.documentCode}`,
  });
  appendEdieTimelineEntry({
    documentId: document.id,
    eventType: "registered",
    title: "Document Registered",
    description: `Document ${document.documentCode} registered`,
    actorId: input.createdBy,
  });

  return document;
}

export function registerEdieDocumentProfile(
  input: Omit<EdieDocumentProfile, "id" | "createdOn" | "modifiedOn" | "modifiedBy">,
): EdieDocumentProfile {
  if (!getEdiePorts().documents.findById(input.documentId)) {
    throw new Error(`EDIE: document "${input.documentId}" not found.`);
  }

  const now = new Date().toISOString();
  const profile: EdieDocumentProfile = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: now,
    modifiedOn: now,
    modifiedBy: input.createdBy,
  };

  getEdiePorts().documentProfiles.save(profile);
  return profile;
}

export function createEdieDocumentVersion(input: {
  documentId: string;
  versionMajor: number;
  versionMinor: number;
  createdBy: string;
}): EdieDocumentVersion {
  const document = getEdiePorts().documents.findById(input.documentId);
  if (!document) throw new Error(`EDIE: document "${input.documentId}" not found.`);

  const version: EdieDocumentVersion = {
    id: crypto.randomUUID(),
    documentId: document.id,
    enterpriseDocumentId: document.enterpriseDocumentId,
    versionMajor: input.versionMajor,
    versionMinor: input.versionMinor,
    lifecycleStatus: EDIE_DOCUMENT_LIFECYCLE_STATUS.DRAFT,
    isCurrent: false,
    createdBy: input.createdBy,
    createdOn: new Date().toISOString(),
  };

  const validation = validateEdieDocumentVersion(version);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  for (const existing of getEdiePorts().versions.listByDocument(document.id)) {
    if (existing.isCurrent) {
      getEdiePorts().versions.save({ ...existing, isCurrent: false });
    }
  }

  version.isCurrent = true;
  getEdiePorts().versions.save(version);

  const updatedDoc: EdieDocumentMasterRecord = {
    ...document,
    currentVersionId: version.id,
    modifiedBy: input.createdBy,
    modifiedOn: new Date().toISOString(),
  };
  getEdiePorts().documents.save(updatedDoc);

  recordEdieAudit({
    entityId: version.id,
    entityType: "document_version",
    action: "created",
    actorId: input.createdBy,
    remarks: `Created version ${version.versionMajor}.${version.versionMinor}`,
  });
  appendEdieTimelineEntry({
    documentId: document.id,
    eventType: "version_created",
    title: "Version Created",
    description: `Version ${version.versionMajor}.${version.versionMinor} created`,
    actorId: input.createdBy,
  });

  return version;
}

export function createEdieDocumentRevision(input: {
  documentId: string;
  versionId: string;
  changeSummary: string;
  createdBy: string;
}): EdieDocumentRevision {
  const document = getEdiePorts().documents.findById(input.documentId);
  if (!document) throw new Error(`EDIE: document "${input.documentId}" not found.`);

  const revisionNumber = document.currentRevisionNumber + 1;
  const revision: EdieDocumentRevision = {
    id: crypto.randomUUID(),
    documentId: input.documentId,
    versionId: input.versionId,
    revisionNumber,
    changeSummary: input.changeSummary,
    createdBy: input.createdBy,
    createdOn: new Date().toISOString(),
  };

  getEdiePorts().revisions.save(revision);
  getEdiePorts().documents.save({
    ...document,
    currentRevisionNumber: revisionNumber,
    modifiedBy: input.createdBy,
    modifiedOn: new Date().toISOString(),
  });

  recordEdieAudit({
    entityId: revision.id,
    entityType: "document_revision",
    action: "created",
    actorId: input.createdBy,
    remarks: `Revision ${revisionNumber}`,
  });

  return revision;
}

export function transitionEdieDocumentLifecycle(input: {
  documentId: string;
  action: EdieDocumentLifecycleAction;
  actorId: string;
  remarks?: string;
}): EdieDocumentMasterRecord | undefined {
  const document = getEdiePorts().documents.findById(input.documentId);
  if (!document) return undefined;

  const target = EDIE_DOCUMENT_LIFECYCLE_ACTION_MAP[input.action] as EdieDocumentLifecycleStatus;
  validateEdieDocumentLifecycleTransition(document.lifecycleStatus, target);

  const updated: EdieDocumentMasterRecord = {
    ...document,
    lifecycleStatus: target,
    modifiedBy: input.actorId,
    modifiedOn: new Date().toISOString(),
  };

  getEdiePorts().documents.save(updated);
  recordEdieAudit({
    entityId: document.id,
    entityType: "document",
    action:
      target === EDIE_DOCUMENT_LIFECYCLE_STATUS.ARCHIVED
        ? "archived"
        : target === EDIE_DOCUMENT_LIFECYCLE_STATUS.UPLOADED
          ? "uploaded"
          : target === EDIE_DOCUMENT_LIFECYCLE_STATUS.VERIFIED
            ? "verified"
            : target === EDIE_DOCUMENT_LIFECYCLE_STATUS.APPROVED
              ? "approved"
              : "lifecycle_changed",
    actorId: input.actorId,
    previousStateRef: document.lifecycleStatus,
    newStateRef: target,
    remarks: input.remarks,
  });
  appendEdieTimelineEntry({
    documentId: document.id,
    eventType: "lifecycle_changed",
    title: "Lifecycle Changed",
    description: `Transitioned from ${document.lifecycleStatus} to ${target}`,
    actorId: input.actorId,
    metadata: { from: document.lifecycleStatus, to: target },
  });

  return updated;
}

export function registerEdieOwnerReference(
  input: Omit<EdieDocumentOwnerReference, "id" | "createdOn">,
): EdieDocumentOwnerReference {
  if (!getEdiePorts().documents.findById(input.documentId)) {
    throw new Error(`EDIE: document "${input.documentId}" not found.`);
  }

  const reference: EdieDocumentOwnerReference = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  getEdiePorts().ownerReferences.save(reference);
  return reference;
}

export function registerEdieSubjectReference(
  input: Omit<EdieDocumentSubjectReference, "id" | "createdOn">,
): EdieDocumentSubjectReference {
  if (!getEdiePorts().documents.findById(input.documentId)) {
    throw new Error(`EDIE: document "${input.documentId}" not found.`);
  }

  const reference: EdieDocumentSubjectReference = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  getEdiePorts().subjectReferences.save(reference);
  return reference;
}

export function tagEdieDocument(
  documentId: string,
  tags: EdieDocumentTag[],
  modifiedBy: string,
): EdieDocumentMasterRecord | undefined {
  const document = getEdiePorts().documents.findById(documentId);
  if (!document) return undefined;

  const updated = { ...document, tags, modifiedBy, modifiedOn: new Date().toISOString() };
  getEdiePorts().documents.save(updated);
  appendEdieTimelineEntry({
    documentId,
    eventType: "tagged",
    title: "Document Tagged",
    description: `Tags: ${tags.map((t) => t.tagCode).join(", ")}`,
    actorId: modifiedBy,
  });
  return updated;
}

export function searchEdieDocuments(query: string): EdieDocumentMasterRecord[] {
  return getEdiePorts().documents.search(query);
}

export function getEdieDocumentByCode(documentCode: string, tenantId?: string): EdieDocumentMasterRecord | undefined {
  return getEdiePorts().documents.findByCode(documentCode, tenantId);
}

export function listEdieDocuments(): EdieDocumentMasterRecord[] {
  return getEdiePorts().documents.list();
}
