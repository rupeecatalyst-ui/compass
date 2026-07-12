/**
 * Enterprise Document Intelligence Engine (EDIE) — Sprint 11 Foundation.
 *
 * Canonical enterprise document domain. Business-agnostic. No loan-specific logic.
 * Documents are enterprise assets — metadata and references only, no physical storage.
 */

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export type EdieDocumentLifecycleStatus =
  | "draft"
  | "uploaded"
  | "verified"
  | "approved"
  | "active"
  | "expired"
  | "archived"
  | "destroyed";

export type EdieDocumentLifecycleAction =
  | "upload"
  | "verify"
  | "approve"
  | "activate"
  | "expire"
  | "archive"
  | "destroy";

// ---------------------------------------------------------------------------
// Taxonomy
// ---------------------------------------------------------------------------

export type EdieDocumentCategory =
  | "identity"
  | "financial"
  | "legal"
  | "operational"
  | "compliance"
  | "communication"
  | "general";

export type EdieDocumentClassification =
  | "public"
  | "internal"
  | "confidential"
  | "restricted";

export type EdieSubjectEntityType =
  | "customer"
  | "partner"
  | "organization"
  | "employee"
  | "opportunity"
  | "loan"
  | "property"
  | "workflow"
  | "task"
  | "case"
  | "product"
  | "document";

export type EdieOwnerEntityType =
  | "customer"
  | "partner"
  | "organization"
  | "employee"
  | "system";

export type EdieVerificationStatus = "pending" | "passed" | "failed" | "waived";

export type EdieValidationStatus = "pending" | "valid" | "invalid";

export type EdieStorageProviderType = "local" | "s3" | "azure_blob" | "gcs" | "custom";

export type EdieTimelineEventType =
  | "registered"
  | "uploaded"
  | "version_created"
  | "verified"
  | "approved"
  | "lifecycle_changed"
  | "archived"
  | "expired"
  | "relationship_added"
  | "checklist_updated"
  | "tagged";

export type EdieAuditEntityType =
  | "document"
  | "document_version"
  | "document_revision"
  | "relationship"
  | "checklist"
  | "verification"
  | "upload_policy"
  | "retention_policy"
  | "storage_reference"
  | "document_rule";

export type EdieDocumentUploadMethod = "folder" | "individual" | "both";

/** SPR-001 extension — contextual document rule definitions. */
export interface EdieDocumentRule {
  id: string;
  ruleCode: string;
  ruleName: string;
  productRef: string;
  employmentType?: string;
  constitution?: string;
  customerCategory?: string;
  loanStage?: string;
  documentTypeRefs: string[];
  uploadMethod: EdieDocumentUploadMethod;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}
// ---------------------------------------------------------------------------
// Document core
// ---------------------------------------------------------------------------

/** Immutable enterprise document identifier — never changes after creation. */
export interface EdieEnterpriseDocumentId {
  id: string;
  documentCode: string;
  createdOn: string;
}

export interface EdieDocumentTag {
  id: string;
  tagCode: string;
  label: string;
}

export interface EdieDocumentType {
  id: string;
  typeCode: string;
  typeName: string;
  description: string;
  category: EdieDocumentCategory;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EdieDocumentMasterRecord {
  id: string;
  /** Immutable enterprise document ID. */
  enterpriseDocumentId: string;
  documentCode: string;
  documentTypeCode: string;
  documentName: string;
  description: string;
  category: EdieDocumentCategory;
  classification: EdieDocumentClassification;
  lifecycleStatus: EdieDocumentLifecycleStatus;
  currentVersionId?: string;
  currentRevisionNumber: number;
  tags: EdieDocumentTag[];
  tenantId?: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

export interface EdieDocumentProfile {
  id: string;
  documentId: string;
  originalFileName: string;
  mimeType: string;
  fileExtension: string;
  fileSizeBytes: number;
  language?: string;
  pageCount?: number;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

/** Alias for master record in enterprise context. */
export type EdieEnterpriseDocument = EdieDocumentMasterRecord;

export interface EdieDocumentVersion {
  id: string;
  documentId: string;
  enterpriseDocumentId: string;
  versionMajor: number;
  versionMinor: number;
  lifecycleStatus: EdieDocumentLifecycleStatus;
  storageRefId?: string;
  hashRefId?: string;
  isCurrent: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EdieDocumentRevision {
  id: string;
  documentId: string;
  versionId: string;
  revisionNumber: number;
  changeSummary: string;
  createdBy: string;
  createdOn: string;
}

export interface EdieDocumentMetadata {
  id: string;
  documentId: string;
  metadataKey: string;
  metadataValue: string;
  dataType: "string" | "number" | "boolean" | "date" | "json";
  createdBy: string;
  createdOn: string;
}

// ---------------------------------------------------------------------------
// References & relationships
// ---------------------------------------------------------------------------

export interface EdieDocumentOwnerReference {
  id: string;
  documentId: string;
  ownerEntityType: EdieOwnerEntityType;
  ownerEntityId: string;
  ownerRef: string;
  createdOn: string;
}

export interface EdieDocumentSubjectReference {
  id: string;
  documentId: string;
  subjectEntityType: EdieSubjectEntityType;
  subjectEntityId: string;
  subjectRef: string;
  role?: string;
  createdOn: string;
}

export interface EdieDocumentRelationship {
  id: string;
  sourceDocumentId: string;
  targetDocumentId: string;
  relationshipType: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

// ---------------------------------------------------------------------------
// Checklist & requirements
// ---------------------------------------------------------------------------

export interface EdieDocumentChecklist {
  id: string;
  checklistCode: string;
  checklistName: string;
  description: string;
  subjectEntityType?: EdieSubjectEntityType;
  subjectEntityId?: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EdieChecklistItem {
  id: string;
  checklistId: string;
  itemCode: string;
  itemName: string;
  documentTypeCode: string;
  required: boolean;
  sortOrder: number;
  enabled: boolean;
}

export interface EdieDocumentRequirement {
  id: string;
  checklistId: string;
  checklistItemId: string;
  subjectEntityType: EdieSubjectEntityType;
  subjectEntityId: string;
  documentId?: string;
  status: "pending" | "fulfilled" | "waived" | "rejected";
  createdBy: string;
  createdOn: string;
}

// ---------------------------------------------------------------------------
// Verification & validation
// ---------------------------------------------------------------------------

export interface EdieVerification {
  id: string;
  documentId: string;
  versionId?: string;
  verificationCode: string;
  verificationName: string;
  status: EdieVerificationStatus;
  verifiedBy?: string;
  verifiedOn?: string;
  createdBy: string;
  createdOn: string;
}

export interface EdieVerificationResult {
  id: string;
  verificationId: string;
  resultCode: string;
  passed: boolean;
  details: Record<string, unknown>;
  recordedOn: string;
}

export interface EdieDocumentValidation {
  id: string;
  documentId: string;
  validationCode: string;
  status: EdieValidationStatus;
  validatedBy?: string;
  validatedOn?: string;
  issues: string[];
}

// ---------------------------------------------------------------------------
// External service references (not implemented here)
// ---------------------------------------------------------------------------

export interface EdieOcrReference {
  id: string;
  documentId: string;
  versionId: string;
  ocrRef: string;
  status: "pending" | "completed" | "failed";
  requestedOn: string;
  completedOn?: string;
}

export interface EdieAiExtractionReference {
  id: string;
  documentId: string;
  versionId: string;
  extractionRef: string;
  status: "pending" | "completed" | "failed";
  requestedOn: string;
  completedOn?: string;
}

export interface EdieDigitalSignatureReference {
  id: string;
  documentId: string;
  versionId: string;
  signatureRef: string;
  signedBy?: string;
  signedOn?: string;
  status: "pending" | "signed" | "invalid";
}

export interface EdieHashReference {
  id: string;
  documentId: string;
  versionId: string;
  algorithm: string;
  hashValue: string;
  computedOn: string;
}

// ---------------------------------------------------------------------------
// Policies
// ---------------------------------------------------------------------------

export interface EdieRetentionPolicy {
  id: string;
  policyCode: string;
  policyName: string;
  retentionDays: number;
  archiveAfterDays?: number;
  destroyAfterDays?: number;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EdieExpiryPolicy {
  id: string;
  policyCode: string;
  policyName: string;
  expiryDays: number;
  warningDays?: number;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EdieArchivePolicy {
  id: string;
  policyCode: string;
  policyName: string;
  archiveAfterDays: number;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EdieUploadPolicy {
  id: string;
  policyCode: string;
  policyName: string;
  maxFileSizeBytes: number;
  allowedFileExtensions: string[];
  allowedMimeTypes: string[];
  multipleUpload: boolean;
  bulkUpload: boolean;
  passwordProtectedFiles: boolean;
  compressionSupport: boolean;
  previewSupport: boolean;
  ocrEligible: boolean;
  aiExtractionEligible: boolean;
  digitalSignatureEligible: boolean;
  virusScanRequired: boolean;
  encryptionRequired: boolean;
  storageProvider: EdieStorageProviderType;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EdieRegisteredFileType {
  id: string;
  extension: string;
  mimeType: string;
  displayName: string;
  enabled: boolean;
  createdOn: string;
}

// ---------------------------------------------------------------------------
// Storage & timeline
// ---------------------------------------------------------------------------

export interface EdieStorageReference {
  id: string;
  documentId: string;
  versionId: string;
  storageProvider: EdieStorageProviderType;
  storageRef: string;
  bucketOrContainer?: string;
  objectKey: string;
  registeredOn: string;
}

export interface EdieDocumentTimelineEntry {
  id: string;
  documentId: string;
  eventType: EdieTimelineEventType;
  title: string;
  description: string;
  actorId: string;
  occurredOn: string;
  metadata?: Record<string, unknown>;
}

export interface EdieDocumentAuditReference {
  id: string;
  entityId: string;
  entityType: EdieAuditEntityType;
  eafAuditEntryId: string;
  recordedOn: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type EdieValidationSeverity = "error" | "warning";

export interface EdieValidationIssue {
  code: string;
  severity: EdieValidationSeverity;
  message: string;
  entityRef?: string;
}

export interface EdieValidationResult {
  valid: boolean;
  issues: EdieValidationIssue[];
}

// ---------------------------------------------------------------------------
// Registry snapshot
// ---------------------------------------------------------------------------

export interface EdieRegistrySnapshot {
  enterpriseDocumentIds: EdieEnterpriseDocumentId[];
  documentTypes: EdieDocumentType[];
  documents: EdieDocumentMasterRecord[];
  documentProfiles: EdieDocumentProfile[];
  versions: EdieDocumentVersion[];
  revisions: EdieDocumentRevision[];
  metadata: EdieDocumentMetadata[];
  ownerReferences: EdieDocumentOwnerReference[];
  subjectReferences: EdieDocumentSubjectReference[];
  relationships: EdieDocumentRelationship[];
  checklists: EdieDocumentChecklist[];
  checklistItems: EdieChecklistItem[];
  requirements: EdieDocumentRequirement[];
  verifications: EdieVerification[];
  verificationResults: EdieVerificationResult[];
  validations: EdieDocumentValidation[];
  ocrReferences: EdieOcrReference[];
  aiExtractionReferences: EdieAiExtractionReference[];
  digitalSignatureReferences: EdieDigitalSignatureReference[];
  hashReferences: EdieHashReference[];
  retentionPolicies: EdieRetentionPolicy[];
  expiryPolicies: EdieExpiryPolicy[];
  archivePolicies: EdieArchivePolicy[];
  uploadPolicies: EdieUploadPolicy[];
  registeredFileTypes: EdieRegisteredFileType[];
  storageReferences: EdieStorageReference[];
  documentRules: EdieDocumentRule[];
  timelineEntries: EdieDocumentTimelineEntry[];
  auditReferences: EdieDocumentAuditReference[];
}