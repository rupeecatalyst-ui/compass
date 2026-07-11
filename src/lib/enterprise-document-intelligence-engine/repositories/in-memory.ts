/**
 * EDIE in-memory adapters — Sprint 11 default implementation.
 */

import type {
  EdieAiExtractionReference,
  EdieArchivePolicy,
  EdieChecklistItem,
  EdieDigitalSignatureReference,
  EdieDocumentAuditReference,
  EdieDocumentChecklist,
  EdieDocumentMasterRecord,
  EdieDocumentMetadata,
  EdieDocumentOwnerReference,
  EdieDocumentProfile,
  EdieDocumentRelationship,
  EdieDocumentRequirement,
  EdieDocumentSubjectReference,
  EdieDocumentTimelineEntry,
  EdieDocumentType,
  EdieDocumentValidation,
  EdieDocumentVersion,
  EdieDocumentRevision,
  EdieEnterpriseDocumentId,
  EdieExpiryPolicy,
  EdieHashReference,
  EdieOcrReference,
  EdieRegisteredFileType,
  EdieRetentionPolicy,
  EdieStorageReference,
  EdieUploadPolicy,
  EdieVerification,
  EdieVerificationResult,
} from "@/types/enterprise-document-intelligence-engine";
import type { EdiePorts } from "@/types/enterprise-document-intelligence-engine-ports";

function createMutableListStore<T>(): {
  list: () => T[];
  replaceAll: (items: T[]) => void;
  upsert: (item: T, key: (item: T) => string) => void;
} {
  let items: T[] = [];
  return {
    list: () => items,
    replaceAll: (next) => {
      items = next;
    },
    upsert: (item, key) => {
      const id = key(item);
      items = [item, ...items.filter((i) => key(i) !== id)];
    },
  };
}

export function createInMemoryEdiePorts(): EdiePorts {
  const enterpriseDocumentIds = createMutableListStore<EdieEnterpriseDocumentId>();
  const documentTypes = createMutableListStore<EdieDocumentType>();
  const documents = createMutableListStore<EdieDocumentMasterRecord>();
  const documentProfiles = createMutableListStore<EdieDocumentProfile>();
  const versions = createMutableListStore<EdieDocumentVersion>();
  const revisions = createMutableListStore<EdieDocumentRevision>();
  const metadata = createMutableListStore<EdieDocumentMetadata>();
  const ownerReferences = createMutableListStore<EdieDocumentOwnerReference>();
  const subjectReferences = createMutableListStore<EdieDocumentSubjectReference>();
  const relationships = createMutableListStore<EdieDocumentRelationship>();
  const checklists = createMutableListStore<EdieDocumentChecklist>();
  const checklistItems = createMutableListStore<EdieChecklistItem>();
  const requirements = createMutableListStore<EdieDocumentRequirement>();
  const verifications = createMutableListStore<EdieVerification>();
  const verificationResults = createMutableListStore<EdieVerificationResult>();
  const validations = createMutableListStore<EdieDocumentValidation>();
  const ocrReferences = createMutableListStore<EdieOcrReference>();
  const aiExtractionReferences = createMutableListStore<EdieAiExtractionReference>();
  const digitalSignatureReferences = createMutableListStore<EdieDigitalSignatureReference>();
  const hashReferences = createMutableListStore<EdieHashReference>();
  const retentionPolicies = createMutableListStore<EdieRetentionPolicy>();
  const expiryPolicies = createMutableListStore<EdieExpiryPolicy>();
  const archivePolicies = createMutableListStore<EdieArchivePolicy>();
  const uploadPolicies = createMutableListStore<EdieUploadPolicy>();
  const registeredFileTypes = createMutableListStore<EdieRegisteredFileType>();
  const storageReferences = createMutableListStore<EdieStorageReference>();
  const timeline = createMutableListStore<EdieDocumentTimelineEntry>();
  const auditReferences = createMutableListStore<EdieDocumentAuditReference>();

  return {
    enterpriseDocumentIds: {
      list: () => enterpriseDocumentIds.list(),
      findById: (id) => enterpriseDocumentIds.list().find((e) => e.id === id),
      findByCode: (documentCode) => enterpriseDocumentIds.list().find((e) => e.documentCode === documentCode),
      save: (entry) => enterpriseDocumentIds.upsert(entry, (e) => e.id),
      replaceAll: (items) => enterpriseDocumentIds.replaceAll(items),
    },
    documentTypes: {
      list: () => documentTypes.list(),
      findById: (id) => documentTypes.list().find((t) => t.id === id),
      findByCode: (typeCode) => documentTypes.list().find((t) => t.typeCode === typeCode && t.enabled),
      save: (type) => documentTypes.upsert(type, (t) => t.id),
      replaceAll: (items) => documentTypes.replaceAll(items),
    },
    documents: {
      list: () => documents.list(),
      findById: (id) => documents.list().find((d) => d.id === id),
      findByCode: (documentCode, tenantId) =>
        documents
          .list()
          .find(
            (d) =>
              d.documentCode === documentCode &&
              d.enabled &&
              (tenantId === undefined || d.tenantId === tenantId),
          ),
      findByEnterpriseDocumentId: (enterpriseDocumentId) =>
        documents.list().find((d) => d.enterpriseDocumentId === enterpriseDocumentId),
      search: (query) => {
        const q = query.toLowerCase();
        return documents.list().filter(
          (d) =>
            d.enabled &&
            (d.documentCode.toLowerCase().includes(q) ||
              d.documentName.toLowerCase().includes(q) ||
              d.tags.some((t) => t.tagCode.toLowerCase().includes(q))),
        );
      },
      save: (document) => documents.upsert(document, (d) => d.id),
      replaceAll: (items) => documents.replaceAll(items),
    },
    documentProfiles: {
      list: () => documentProfiles.list(),
      findById: (id) => documentProfiles.list().find((p) => p.id === id),
      findByDocument: (documentId) => documentProfiles.list().find((p) => p.documentId === documentId),
      save: (profile) => documentProfiles.upsert(profile, (p) => p.id),
      replaceAll: (items) => documentProfiles.replaceAll(items),
    },
    versions: {
      list: () => versions.list(),
      findById: (id) => versions.list().find((v) => v.id === id),
      listByDocument: (documentId) => versions.list().filter((v) => v.documentId === documentId),
      findByDocumentAndVersion: (documentId, major, minor) =>
        versions
          .list()
          .find((v) => v.documentId === documentId && v.versionMajor === major && v.versionMinor === minor),
      save: (version) => versions.upsert(version, (v) => v.id),
      replaceAll: (items) => versions.replaceAll(items),
    },
    revisions: {
      list: () => revisions.list(),
      listByDocument: (documentId) => revisions.list().filter((r) => r.documentId === documentId),
      listByVersion: (versionId) => revisions.list().filter((r) => r.versionId === versionId),
      save: (revision) => revisions.upsert(revision, (r) => r.id),
      replaceAll: (items) => revisions.replaceAll(items),
    },
    metadata: {
      list: () => metadata.list(),
      listByDocument: (documentId) => metadata.list().filter((m) => m.documentId === documentId),
      save: (entry) => metadata.upsert(entry, (m) => m.id),
      replaceAll: (items) => metadata.replaceAll(items),
    },
    ownerReferences: {
      list: () => ownerReferences.list(),
      listByDocument: (documentId) => ownerReferences.list().filter((r) => r.documentId === documentId),
      save: (reference) => ownerReferences.upsert(reference, (r) => r.id),
      replaceAll: (items) => ownerReferences.replaceAll(items),
    },
    subjectReferences: {
      list: () => subjectReferences.list(),
      listByDocument: (documentId) => subjectReferences.list().filter((r) => r.documentId === documentId),
      listBySubject: (subjectEntityType, subjectEntityId) =>
        subjectReferences
          .list()
          .filter((r) => r.subjectEntityType === subjectEntityType && r.subjectEntityId === subjectEntityId),
      save: (reference) => subjectReferences.upsert(reference, (r) => r.id),
      replaceAll: (items) => subjectReferences.replaceAll(items),
    },
    relationships: {
      list: () => relationships.list(),
      findById: (id) => relationships.list().find((r) => r.id === id),
      listBySource: (sourceDocumentId) =>
        relationships.list().filter((r) => r.sourceDocumentId === sourceDocumentId),
      listByTarget: (targetDocumentId) =>
        relationships.list().filter((r) => r.targetDocumentId === targetDocumentId),
      save: (relationship) => relationships.upsert(relationship, (r) => r.id),
      replaceAll: (items) => relationships.replaceAll(items),
    },
    checklists: {
      list: () => checklists.list(),
      findById: (id) => checklists.list().find((c) => c.id === id),
      findByCode: (checklistCode) => checklists.list().find((c) => c.checklistCode === checklistCode && c.enabled),
      save: (checklist) => checklists.upsert(checklist, (c) => c.id),
      replaceAll: (items) => checklists.replaceAll(items),
    },
    checklistItems: {
      list: () => checklistItems.list(),
      listByChecklist: (checklistId) => checklistItems.list().filter((i) => i.checklistId === checklistId),
      save: (item) => checklistItems.upsert(item, (i) => i.id),
      replaceAll: (items) => checklistItems.replaceAll(items),
    },
    requirements: {
      list: () => requirements.list(),
      listBySubject: (subjectEntityType, subjectEntityId) =>
        requirements
          .list()
          .filter((r) => r.subjectEntityType === subjectEntityType && r.subjectEntityId === subjectEntityId),
      save: (requirement) => requirements.upsert(requirement, (r) => r.id),
      replaceAll: (items) => requirements.replaceAll(items),
    },
    verifications: {
      list: () => verifications.list(),
      findById: (id) => verifications.list().find((v) => v.id === id),
      listByDocument: (documentId) => verifications.list().filter((v) => v.documentId === documentId),
      save: (verification) => verifications.upsert(verification, (v) => v.id),
      replaceAll: (items) => verifications.replaceAll(items),
    },
    verificationResults: {
      list: () => verificationResults.list(),
      listByVerification: (verificationId) =>
        verificationResults.list().filter((r) => r.verificationId === verificationId),
      save: (result) => verificationResults.upsert(result, (r) => r.id),
      replaceAll: (items) => verificationResults.replaceAll(items),
    },
    validations: {
      list: () => validations.list(),
      listByDocument: (documentId) => validations.list().filter((v) => v.documentId === documentId),
      save: (validation) => validations.upsert(validation, (v) => v.id),
      replaceAll: (items) => validations.replaceAll(items),
    },
    ocrReferences: {
      list: () => ocrReferences.list(),
      listByDocument: (documentId) => ocrReferences.list().filter((r) => r.documentId === documentId),
      save: (reference) => ocrReferences.upsert(reference, (r) => r.id),
      replaceAll: (items) => ocrReferences.replaceAll(items),
    },
    aiExtractionReferences: {
      list: () => aiExtractionReferences.list(),
      listByDocument: (documentId) => aiExtractionReferences.list().filter((r) => r.documentId === documentId),
      save: (reference) => aiExtractionReferences.upsert(reference, (r) => r.id),
      replaceAll: (items) => aiExtractionReferences.replaceAll(items),
    },
    digitalSignatureReferences: {
      list: () => digitalSignatureReferences.list(),
      listByDocument: (documentId) => digitalSignatureReferences.list().filter((r) => r.documentId === documentId),
      save: (reference) => digitalSignatureReferences.upsert(reference, (r) => r.id),
      replaceAll: (items) => digitalSignatureReferences.replaceAll(items),
    },
    hashReferences: {
      list: () => hashReferences.list(),
      findByHashValue: (hashValue) => hashReferences.list().find((r) => r.hashValue === hashValue),
      listByDocument: (documentId) => hashReferences.list().filter((r) => r.documentId === documentId),
      save: (reference) => hashReferences.upsert(reference, (r) => r.id),
      replaceAll: (items) => hashReferences.replaceAll(items),
    },
    retentionPolicies: {
      list: () => retentionPolicies.list(),
      findById: (id) => retentionPolicies.list().find((p) => p.id === id),
      findByCode: (policyCode) => retentionPolicies.list().find((p) => p.policyCode === policyCode && p.enabled),
      save: (policy) => retentionPolicies.upsert(policy, (p) => p.id),
      replaceAll: (items) => retentionPolicies.replaceAll(items),
    },
    expiryPolicies: {
      list: () => expiryPolicies.list(),
      findById: (id) => expiryPolicies.list().find((p) => p.id === id),
      findByCode: (policyCode) => expiryPolicies.list().find((p) => p.policyCode === policyCode && p.enabled),
      save: (policy) => expiryPolicies.upsert(policy, (p) => p.id),
      replaceAll: (items) => expiryPolicies.replaceAll(items),
    },
    archivePolicies: {
      list: () => archivePolicies.list(),
      findById: (id) => archivePolicies.list().find((p) => p.id === id),
      findByCode: (policyCode) => archivePolicies.list().find((p) => p.policyCode === policyCode && p.enabled),
      save: (policy) => archivePolicies.upsert(policy, (p) => p.id),
      replaceAll: (items) => archivePolicies.replaceAll(items),
    },
    uploadPolicies: {
      list: () => uploadPolicies.list(),
      findById: (id) => uploadPolicies.list().find((p) => p.id === id),
      findByCode: (policyCode) => uploadPolicies.list().find((p) => p.policyCode === policyCode && p.enabled),
      save: (policy) => uploadPolicies.upsert(policy, (p) => p.id),
      replaceAll: (items) => uploadPolicies.replaceAll(items),
    },
    registeredFileTypes: {
      list: () => registeredFileTypes.list(),
      findByExtension: (extension) =>
        registeredFileTypes.list().find((f) => f.extension === extension.toLowerCase() && f.enabled),
      save: (fileType) => registeredFileTypes.upsert(fileType, (f) => f.id),
      replaceAll: (items) => registeredFileTypes.replaceAll(items),
    },
    storageReferences: {
      list: () => storageReferences.list(),
      findById: (id) => storageReferences.list().find((r) => r.id === id),
      listByDocument: (documentId) => storageReferences.list().filter((r) => r.documentId === documentId),
      save: (reference) => storageReferences.upsert(reference, (r) => r.id),
      replaceAll: (items) => storageReferences.replaceAll(items),
    },
    timeline: {
      list: () => timeline.list(),
      listByDocument: (documentId) => timeline.list().filter((e) => e.documentId === documentId),
      save: (entry) => timeline.upsert(entry, (e) => e.id),
      replaceAll: (items) => timeline.replaceAll(items),
    },
    auditReferences: {
      list: () => auditReferences.list(),
      listByEntity: (entityId) => auditReferences.list().filter((r) => r.entityId === entityId),
      save: (reference) => auditReferences.upsert(reference, (r) => r.id),
      replaceAll: (items) => auditReferences.replaceAll(items),
    },
  };
}
