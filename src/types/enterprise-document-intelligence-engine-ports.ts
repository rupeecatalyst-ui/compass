/**
 * EDIE Ports — repository contracts.
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
  EdieDocumentRule,
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
  EdieRegistrySnapshot,
  EdieRetentionPolicy,
  EdieStorageReference,
  EdieUploadPolicy,
  EdieVerification,
  EdieVerificationResult,
} from "./enterprise-document-intelligence-engine";

export interface EdieEnterpriseDocumentIdRepositoryPort {
  list(): EdieEnterpriseDocumentId[];
  findById(id: string): EdieEnterpriseDocumentId | undefined;
  findByCode(documentCode: string): EdieEnterpriseDocumentId | undefined;
  save(entry: EdieEnterpriseDocumentId): void;
  replaceAll(entries: EdieEnterpriseDocumentId[]): void;
}

export interface EdieDocumentTypeRepositoryPort {
  list(): EdieDocumentType[];
  findById(id: string): EdieDocumentType | undefined;
  findByCode(typeCode: string): EdieDocumentType | undefined;
  save(type: EdieDocumentType): void;
  replaceAll(types: EdieDocumentType[]): void;
}

export interface EdieDocumentRepositoryPort {
  list(): EdieDocumentMasterRecord[];
  findById(id: string): EdieDocumentMasterRecord | undefined;
  findByCode(documentCode: string, tenantId?: string): EdieDocumentMasterRecord | undefined;
  findByEnterpriseDocumentId(enterpriseDocumentId: string): EdieDocumentMasterRecord | undefined;
  search(query: string): EdieDocumentMasterRecord[];
  save(document: EdieDocumentMasterRecord): void;
  replaceAll(documents: EdieDocumentMasterRecord[]): void;
}

export interface EdieDocumentProfileRepositoryPort {
  list(): EdieDocumentProfile[];
  findById(id: string): EdieDocumentProfile | undefined;
  findByDocument(documentId: string): EdieDocumentProfile | undefined;
  save(profile: EdieDocumentProfile): void;
  replaceAll(profiles: EdieDocumentProfile[]): void;
}

export interface EdieDocumentVersionRepositoryPort {
  list(): EdieDocumentVersion[];
  findById(id: string): EdieDocumentVersion | undefined;
  listByDocument(documentId: string): EdieDocumentVersion[];
  findByDocumentAndVersion(documentId: string, major: number, minor: number): EdieDocumentVersion | undefined;
  save(version: EdieDocumentVersion): void;
  replaceAll(versions: EdieDocumentVersion[]): void;
}

export interface EdieDocumentRevisionRepositoryPort {
  list(): EdieDocumentRevision[];
  listByDocument(documentId: string): EdieDocumentRevision[];
  listByVersion(versionId: string): EdieDocumentRevision[];
  save(revision: EdieDocumentRevision): void;
  replaceAll(revisions: EdieDocumentRevision[]): void;
}

export interface EdieMetadataRepositoryPort {
  list(): EdieDocumentMetadata[];
  listByDocument(documentId: string): EdieDocumentMetadata[];
  save(metadata: EdieDocumentMetadata): void;
  replaceAll(metadata: EdieDocumentMetadata[]): void;
}

export interface EdieOwnerReferenceRepositoryPort {
  list(): EdieDocumentOwnerReference[];
  listByDocument(documentId: string): EdieDocumentOwnerReference[];
  save(reference: EdieDocumentOwnerReference): void;
  replaceAll(references: EdieDocumentOwnerReference[]): void;
}

export interface EdieSubjectReferenceRepositoryPort {
  list(): EdieDocumentSubjectReference[];
  listByDocument(documentId: string): EdieDocumentSubjectReference[];
  listBySubject(subjectEntityType: string, subjectEntityId: string): EdieDocumentSubjectReference[];
  save(reference: EdieDocumentSubjectReference): void;
  replaceAll(references: EdieDocumentSubjectReference[]): void;
}

export interface EdieRelationshipRepositoryPort {
  list(): EdieDocumentRelationship[];
  findById(id: string): EdieDocumentRelationship | undefined;
  listBySource(sourceDocumentId: string): EdieDocumentRelationship[];
  listByTarget(targetDocumentId: string): EdieDocumentRelationship[];
  save(relationship: EdieDocumentRelationship): void;
  replaceAll(relationships: EdieDocumentRelationship[]): void;
}

export interface EdieChecklistRepositoryPort {
  list(): EdieDocumentChecklist[];
  findById(id: string): EdieDocumentChecklist | undefined;
  findByCode(checklistCode: string): EdieDocumentChecklist | undefined;
  save(checklist: EdieDocumentChecklist): void;
  replaceAll(checklists: EdieDocumentChecklist[]): void;
}

export interface EdieChecklistItemRepositoryPort {
  list(): EdieChecklistItem[];
  listByChecklist(checklistId: string): EdieChecklistItem[];
  save(item: EdieChecklistItem): void;
  replaceAll(items: EdieChecklistItem[]): void;
}

export interface EdieRequirementRepositoryPort {
  list(): EdieDocumentRequirement[];
  listBySubject(subjectEntityType: string, subjectEntityId: string): EdieDocumentRequirement[];
  save(requirement: EdieDocumentRequirement): void;
  replaceAll(requirements: EdieDocumentRequirement[]): void;
}

export interface EdieVerificationRepositoryPort {
  list(): EdieVerification[];
  findById(id: string): EdieVerification | undefined;
  listByDocument(documentId: string): EdieVerification[];
  save(verification: EdieVerification): void;
  replaceAll(verifications: EdieVerification[]): void;
}

export interface EdieVerificationResultRepositoryPort {
  list(): EdieVerificationResult[];
  listByVerification(verificationId: string): EdieVerificationResult[];
  save(result: EdieVerificationResult): void;
  replaceAll(results: EdieVerificationResult[]): void;
}

export interface EdieValidationRepositoryPort {
  list(): EdieDocumentValidation[];
  listByDocument(documentId: string): EdieDocumentValidation[];
  save(validation: EdieDocumentValidation): void;
  replaceAll(validations: EdieDocumentValidation[]): void;
}

export interface EdieOcrReferenceRepositoryPort {
  list(): EdieOcrReference[];
  listByDocument(documentId: string): EdieOcrReference[];
  save(reference: EdieOcrReference): void;
  replaceAll(references: EdieOcrReference[]): void;
}

export interface EdieAiExtractionReferenceRepositoryPort {
  list(): EdieAiExtractionReference[];
  listByDocument(documentId: string): EdieAiExtractionReference[];
  save(reference: EdieAiExtractionReference): void;
  replaceAll(references: EdieAiExtractionReference[]): void;
}

export interface EdieDigitalSignatureReferenceRepositoryPort {
  list(): EdieDigitalSignatureReference[];
  listByDocument(documentId: string): EdieDigitalSignatureReference[];
  save(reference: EdieDigitalSignatureReference): void;
  replaceAll(references: EdieDigitalSignatureReference[]): void;
}

export interface EdieHashReferenceRepositoryPort {
  list(): EdieHashReference[];
  findByHashValue(hashValue: string): EdieHashReference | undefined;
  listByDocument(documentId: string): EdieHashReference[];
  save(reference: EdieHashReference): void;
  replaceAll(references: EdieHashReference[]): void;
}

export interface EdieRetentionPolicyRepositoryPort {
  list(): EdieRetentionPolicy[];
  findById(id: string): EdieRetentionPolicy | undefined;
  findByCode(policyCode: string): EdieRetentionPolicy | undefined;
  save(policy: EdieRetentionPolicy): void;
  replaceAll(policies: EdieRetentionPolicy[]): void;
}

export interface EdieExpiryPolicyRepositoryPort {
  list(): EdieExpiryPolicy[];
  findById(id: string): EdieExpiryPolicy | undefined;
  findByCode(policyCode: string): EdieExpiryPolicy | undefined;
  save(policy: EdieExpiryPolicy): void;
  replaceAll(policies: EdieExpiryPolicy[]): void;
}

export interface EdieArchivePolicyRepositoryPort {
  list(): EdieArchivePolicy[];
  findById(id: string): EdieArchivePolicy | undefined;
  findByCode(policyCode: string): EdieArchivePolicy | undefined;
  save(policy: EdieArchivePolicy): void;
  replaceAll(policies: EdieArchivePolicy[]): void;
}

export interface EdieUploadPolicyRepositoryPort {
  list(): EdieUploadPolicy[];
  findById(id: string): EdieUploadPolicy | undefined;
  findByCode(policyCode: string): EdieUploadPolicy | undefined;
  save(policy: EdieUploadPolicy): void;
  replaceAll(policies: EdieUploadPolicy[]): void;
}

export interface EdieRegisteredFileTypeRepositoryPort {
  list(): EdieRegisteredFileType[];
  findByExtension(extension: string): EdieRegisteredFileType | undefined;
  save(fileType: EdieRegisteredFileType): void;
  replaceAll(fileTypes: EdieRegisteredFileType[]): void;
}

export interface EdieStorageReferenceRepositoryPort {
  list(): EdieStorageReference[];
  findById(id: string): EdieStorageReference | undefined;
  listByDocument(documentId: string): EdieStorageReference[];
  save(reference: EdieStorageReference): void;
  replaceAll(references: EdieStorageReference[]): void;
}

export interface EdieTimelineRepositoryPort {
  list(): EdieDocumentTimelineEntry[];
  listByDocument(documentId: string): EdieDocumentTimelineEntry[];
  save(entry: EdieDocumentTimelineEntry): void;
  replaceAll(entries: EdieDocumentTimelineEntry[]): void;
}

export interface EdieAuditReferenceRepositoryPort {
  list(): EdieDocumentAuditReference[];
  listByEntity(entityId: string): EdieDocumentAuditReference[];
  save(reference: EdieDocumentAuditReference): void;
  replaceAll(references: EdieDocumentAuditReference[]): void;
}

export interface EdieDocumentRuleRepositoryPort {
  list(): EdieDocumentRule[];
  findById(id: string): EdieDocumentRule | undefined;
  findByCode(ruleCode: string): EdieDocumentRule | undefined;
  save(rule: EdieDocumentRule): void;
  replaceAll(rules: EdieDocumentRule[]): void;
}

export interface EdiePorts {
  enterpriseDocumentIds: EdieEnterpriseDocumentIdRepositoryPort;
  documentTypes: EdieDocumentTypeRepositoryPort;
  documents: EdieDocumentRepositoryPort;
  documentProfiles: EdieDocumentProfileRepositoryPort;
  versions: EdieDocumentVersionRepositoryPort;
  revisions: EdieDocumentRevisionRepositoryPort;
  metadata: EdieMetadataRepositoryPort;
  ownerReferences: EdieOwnerReferenceRepositoryPort;
  subjectReferences: EdieSubjectReferenceRepositoryPort;
  relationships: EdieRelationshipRepositoryPort;
  checklists: EdieChecklistRepositoryPort;
  checklistItems: EdieChecklistItemRepositoryPort;
  requirements: EdieRequirementRepositoryPort;
  verifications: EdieVerificationRepositoryPort;
  verificationResults: EdieVerificationResultRepositoryPort;
  validations: EdieValidationRepositoryPort;
  ocrReferences: EdieOcrReferenceRepositoryPort;
  aiExtractionReferences: EdieAiExtractionReferenceRepositoryPort;
  digitalSignatureReferences: EdieDigitalSignatureReferenceRepositoryPort;
  hashReferences: EdieHashReferenceRepositoryPort;
  retentionPolicies: EdieRetentionPolicyRepositoryPort;
  expiryPolicies: EdieExpiryPolicyRepositoryPort;
  archivePolicies: EdieArchivePolicyRepositoryPort;
  uploadPolicies: EdieUploadPolicyRepositoryPort;
  registeredFileTypes: EdieRegisteredFileTypeRepositoryPort;
  storageReferences: EdieStorageReferenceRepositoryPort;
  documentRules: EdieDocumentRuleRepositoryPort;
  timeline: EdieTimelineRepositoryPort;
  auditReferences: EdieAuditReferenceRepositoryPort;
}
export type PartialEdiePorts = Partial<EdiePorts>;

export type { EdieRegistrySnapshot };
