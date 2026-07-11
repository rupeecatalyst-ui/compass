/**
 * EDIE foundation validation — smoke checks for Sprint 11 deliverable verification.
 */

import {
  EDIE_DOCUMENT_CATEGORIES,
  EDIE_DOCUMENT_CLASSIFICATIONS,
  EDIE_DOCUMENT_LIFECYCLE_STATUS,
  EDIE_SUBJECT_ENTITY_TYPES,
} from "@/constants/enterprise-document-intelligence-engine";
import {
  addEdieChecklistItem,
  fulfillEdieDocumentRequirement,
  registerEdieChecklist,
  registerEdieDocumentRequirement,
} from "./checklist-registry";
import { resetEdieComposition } from "./composition";
import {
  createEdieDocumentRevision,
  createEdieDocumentVersion,
  registerEdieDocument,
  registerEdieDocumentProfile,
  registerEdieDocumentType,
  registerEdieOwnerReference,
  registerEdieSubjectReference,
  searchEdieDocuments,
  tagEdieDocument,
  transitionEdieDocumentLifecycle,
} from "./document-registry";
import { registerEdieDocumentMetadata } from "./metadata-registry";
import { registerEdieDocumentRelationship } from "./relationship-registry";
import { getEdieRegistrySnapshot } from "./registry-snapshot";
import {
  registerEdieArchivePolicy,
  registerEdieExpiryPolicy,
  registerEdieRetentionPolicy,
} from "./retention-registry";
import { registerEdieStorageReference } from "./storage-registry";
import { listEdieTimeline } from "./timeline-registry";
import {
  initializeEdieRegisteredFileTypes,
  registerEdieUploadPolicy,
  validateEdieUploadAgainstPolicy,
} from "./upload-policy-registry";
import {
  completeEdieVerification,
  registerEdieAiExtractionReference,
  registerEdieDigitalSignatureReference,
  registerEdieHashReference,
  registerEdieOcrReference,
  registerEdieVerification,
  recordEdieVerificationResult,
} from "./verification-registry";
import {
  validateEdieDocumentRelationship,
  validateEdieHashReference,
  validateEdieUploadPolicy,
  validateEdieVerification,
} from "./validation-engine";

export function runEdieFoundationValidation(): { passed: boolean; details: Record<string, unknown> } {
  resetEdieComposition();
  initializeEdieRegisteredFileTypes();

  registerEdieDocumentType({
    typeCode: "IDENTITY_PROOF",
    typeName: "Identity Proof",
    description: "Government-issued identity document",
    category: EDIE_DOCUMENT_CATEGORIES.IDENTITY,
    enabled: true,
    createdBy: "system",
  });

  const uploadPolicy = registerEdieUploadPolicy({
    policyCode: "STANDARD_UPLOAD",
    policyName: "Standard Upload Policy",
    maxFileSizeBytes: 10 * 1024 * 1024,
    allowedFileExtensions: ["pdf", "jpg", "jpeg", "png"],
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    multipleUpload: true,
    bulkUpload: false,
    passwordProtectedFiles: false,
    compressionSupport: true,
    previewSupport: true,
    ocrEligible: true,
    aiExtractionEligible: true,
    digitalSignatureEligible: true,
    virusScanRequired: true,
    encryptionRequired: true,
    storageProvider: "s3",
    enabled: true,
    createdBy: "system",
  });

  validateEdieUploadAgainstPolicy({
    policyCode: "STANDARD_UPLOAD",
    fileExtension: "pdf",
    mimeType: "application/pdf",
    fileSizeBytes: 1024 * 512,
  });

  registerEdieRetentionPolicy({
    policyCode: "STANDARD_RETENTION",
    policyName: "Standard Retention",
    retentionDays: 2555,
    archiveAfterDays: 1825,
    destroyAfterDays: 3650,
    enabled: true,
    createdBy: "system",
  });

  registerEdieExpiryPolicy({
    policyCode: "ID_EXPIRY",
    policyName: "Identity Document Expiry",
    expiryDays: 365,
    warningDays: 30,
    enabled: true,
    createdBy: "system",
  });

  registerEdieArchivePolicy({
    policyCode: "STANDARD_ARCHIVE",
    policyName: "Standard Archive",
    archiveAfterDays: 1825,
    enabled: true,
    createdBy: "system",
  });

  const document = registerEdieDocument({
    documentCode: "DOC-001",
    documentTypeCode: "IDENTITY_PROOF",
    documentName: "Passport Copy",
    description: "Customer passport document",
    category: EDIE_DOCUMENT_CATEGORIES.IDENTITY,
    classification: EDIE_DOCUMENT_CLASSIFICATIONS.CONFIDENTIAL,
    tenantId: "tenant-1",
    createdBy: "system",
  });

  const enterpriseDocumentId = document.enterpriseDocumentId;

  registerEdieDocumentProfile({
    documentId: document.id,
    originalFileName: "passport.pdf",
    mimeType: "application/pdf",
    fileExtension: "pdf",
    fileSizeBytes: 512000,
    createdBy: "system",
  });

  const version = createEdieDocumentVersion({
    documentId: document.id,
    versionMajor: 1,
    versionMinor: 0,
    createdBy: "system",
  });

  const revision = createEdieDocumentRevision({
    documentId: document.id,
    versionId: version.id,
    changeSummary: "Initial upload",
    createdBy: "system",
  });

  const uploaded = transitionEdieDocumentLifecycle({
    documentId: document.id,
    action: "upload",
    actorId: "system",
  });

  registerEdieOwnerReference({
    documentId: document.id,
    ownerEntityType: "customer",
    ownerEntityId: "cust-001",
    ownerRef: "ec360:customer:cust-001",
  });

  registerEdieSubjectReference({
    documentId: document.id,
    subjectEntityType: EDIE_SUBJECT_ENTITY_TYPES.CUSTOMER,
    subjectEntityId: "cust-001",
    subjectRef: "ec360:customer:cust-001",
    role: "primary_subject",
  });

  registerEdieSubjectReference({
    documentId: document.id,
    subjectEntityType: EDIE_SUBJECT_ENTITY_TYPES.LOAN,
    subjectEntityId: "loan-001",
    subjectRef: "loan:loan-001",
    role: "supporting_document",
  });

  const hashRef = registerEdieHashReference({
    documentId: document.id,
    versionId: version.id,
    algorithm: "SHA-256",
    hashValue: "abc123def456789",
  });

  const storageRef = registerEdieStorageReference({
    documentId: document.id,
    versionId: version.id,
    storageProvider: "s3",
    storageRef: "s3://bucket/docs/passport.pdf",
    bucketOrContainer: "enterprise-docs",
    objectKey: "tenant-1/DOC-001/v1/passport.pdf",
  });

  registerEdieOcrReference({
    documentId: document.id,
    versionId: version.id,
    ocrRef: "ocr:passport:001",
    status: "completed",
    completedOn: new Date().toISOString(),
  });

  registerEdieAiExtractionReference({
    documentId: document.id,
    versionId: version.id,
    extractionRef: "ai:extract:001",
    status: "completed",
    completedOn: new Date().toISOString(),
  });

  registerEdieDigitalSignatureReference({
    documentId: document.id,
    versionId: version.id,
    signatureRef: "dsig:001",
    signedBy: "cust-001",
    signedOn: new Date().toISOString(),
    status: "signed",
  });

  registerEdieDocumentMetadata({
    documentId: document.id,
    metadataKey: "issuing_country",
    metadataValue: "IN",
    dataType: "string",
    createdBy: "system",
  });

  const doc2 = registerEdieDocument({
    documentCode: "DOC-002",
    documentTypeCode: "IDENTITY_PROOF",
    documentName: "Address Proof",
    description: "Utility bill",
    category: EDIE_DOCUMENT_CATEGORIES.IDENTITY,
    classification: EDIE_DOCUMENT_CLASSIFICATIONS.CONFIDENTIAL,
    tenantId: "tenant-1",
    createdBy: "system",
  });

  const relationship = registerEdieDocumentRelationship({
    sourceDocumentId: document.id,
    targetDocumentId: doc2.id,
    relationshipType: "supporting",
    enabled: true,
    createdBy: "system",
  });

  const checklist = registerEdieChecklist({
    checklistCode: "KYC_CHECKLIST",
    checklistName: "KYC Document Checklist",
    description: "Required KYC documents",
    subjectEntityType: EDIE_SUBJECT_ENTITY_TYPES.CUSTOMER,
    subjectEntityId: "cust-001",
    enabled: true,
    createdBy: "system",
  });

  const checklistItem = addEdieChecklistItem({
    checklistId: checklist.id,
    itemCode: "PASSPORT",
    itemName: "Passport",
    documentTypeCode: "IDENTITY_PROOF",
    required: true,
    sortOrder: 1,
    enabled: true,
  });

  const requirement = registerEdieDocumentRequirement({
    checklistId: checklist.id,
    checklistItemId: checklistItem.id,
    subjectEntityType: EDIE_SUBJECT_ENTITY_TYPES.CUSTOMER,
    subjectEntityId: "cust-001",
    status: "pending",
    createdBy: "system",
  });

  fulfillEdieDocumentRequirement(requirement.id, document.id);

  const verification = registerEdieVerification({
    documentId: document.id,
    versionId: version.id,
    verificationCode: "ID_VERIFY",
    verificationName: "Identity Verification",
    status: "pending",
    createdBy: "system",
  });

  recordEdieVerificationResult({
    verificationId: verification.id,
    resultCode: "DOC_AUTHENTIC",
    passed: true,
    details: { method: "manual_review" },
  });

  const verified = completeEdieVerification({
    verificationId: verification.id,
    verifiedBy: "system",
    passed: true,
  });

  transitionEdieDocumentLifecycle({ documentId: document.id, action: "verify", actorId: "system" });
  transitionEdieDocumentLifecycle({ documentId: document.id, action: "approve", actorId: "system" });
  const activated = transitionEdieDocumentLifecycle({
    documentId: document.id,
    action: "activate",
    actorId: "system",
  });

  const tagged = tagEdieDocument(
    document.id,
    [{ id: crypto.randomUUID(), tagCode: "verified", label: "Verified Document" }],
    "system",
  );

  const searchResults = searchEdieDocuments("Passport");
  const timeline = listEdieTimeline(document.id);

  let rejectionChecks = 0;

  try {
    registerEdieDocument({
      documentCode: "DOC-001",
      documentTypeCode: "IDENTITY_PROOF",
      documentName: "Duplicate",
      description: "",
      tenantId: "tenant-1",
      createdBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  try {
    registerEdieHashReference({
      documentId: doc2.id,
      versionId: version.id,
      algorithm: "SHA-256",
      hashValue: "abc123def456789",
    });
  } catch {
    rejectionChecks += 1;
  }

  const dupHashCheck = validateEdieHashReference({
    id: crypto.randomUUID(),
    documentId: doc2.id,
    versionId: version.id,
    algorithm: "SHA-256",
    hashValue: "abc123def456789",
    computedOn: new Date().toISOString(),
  });
  if (dupHashCheck.issues.some((i) => i.code === "EDIE_DUPLICATE_HASH")) rejectionChecks += 1;

  try {
    createEdieDocumentVersion({
      documentId: document.id,
      versionMajor: 1,
      versionMinor: 0,
      createdBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  try {
    registerEdieDocumentRelationship({
      sourceDocumentId: document.id,
      targetDocumentId: document.id,
      relationshipType: "self",
      enabled: true,
      createdBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  try {
    registerEdieDocumentRelationship({
      sourceDocumentId: doc2.id,
      targetDocumentId: document.id,
      relationshipType: "circular",
      enabled: true,
      createdBy: "system",
    });
    registerEdieDocumentRelationship({
      sourceDocumentId: document.id,
      targetDocumentId: doc2.id,
      relationshipType: "circular",
      enabled: true,
      createdBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  const cycleCheck = validateEdieDocumentRelationship({
    id: crypto.randomUUID(),
    sourceDocumentId: doc2.id,
    targetDocumentId: document.id,
    relationshipType: "circular",
    enabled: true,
    createdBy: "system",
    createdOn: new Date().toISOString(),
  });
  if (cycleCheck.issues.some((i) => i.code === "EDIE_CIRCULAR_RELATIONSHIP")) rejectionChecks += 1;

  const inconsistentVerification = validateEdieVerification({
    id: crypto.randomUUID(),
    documentId: document.id,
    verificationCode: "BAD",
    verificationName: "Bad",
    status: "passed",
    createdBy: "system",
    createdOn: new Date().toISOString(),
  });
  if (inconsistentVerification.issues.some((i) => i.code === "EDIE_VERIFICATION_INCONSISTENT")) {
    rejectionChecks += 1;
  }

  const uploadViolation = validateEdieUploadPolicy(uploadPolicy, "exe", "application/x-msdownload", 20 * 1024 * 1024);
  if (uploadViolation.issues.some((i) => i.code === "EDIE_UPLOAD_POLICY_VIOLATION")) rejectionChecks += 1;

  try {
    validateEdieUploadAgainstPolicy({
      policyCode: "STANDARD_UPLOAD",
      fileExtension: "exe",
      mimeType: "application/x-msdownload",
      fileSizeBytes: 20 * 1024 * 1024,
    });
  } catch {
    rejectionChecks += 1;
  }

  const snap = getEdieRegistrySnapshot();

  const passed =
    uploaded?.lifecycleStatus === EDIE_DOCUMENT_LIFECYCLE_STATUS.UPLOADED &&
    activated?.lifecycleStatus === EDIE_DOCUMENT_LIFECYCLE_STATUS.ACTIVE &&
    verified?.status === "passed" &&
    enterpriseDocumentId === document.enterpriseDocumentId &&
    version.isCurrent &&
    revision.revisionNumber === 1 &&
    hashRef.hashValue === "abc123def456789" &&
    storageRef.objectKey.includes("DOC-001") &&
    relationship.relationshipType === "supporting" &&
    tagged?.tags.length === 1 &&
    searchResults.length >= 1 &&
    timeline.length >= 5 &&
    snap.documents.length === 2 &&
    snap.versions.length === 1 &&
    snap.registeredFileTypes.length >= 26 &&
    snap.uploadPolicies.length === 1 &&
    snap.retentionPolicies.length === 1 &&
    snap.subjectReferences.length >= 2 &&
    snap.auditReferences.length >= 5 &&
    rejectionChecks >= 8;

  return {
    passed,
    details: {
      documentCode: document.documentCode,
      enterpriseDocumentId,
      activatedStatus: activated?.lifecycleStatus,
      versionMajor: version.versionMajor,
      hashValue: hashRef.hashValue,
      storageKey: storageRef.objectKey,
      registeredFileTypes: snap.registeredFileTypes.length,
      timelineEntries: timeline.length,
      searchHits: searchResults.length,
      documents: snap.documents.length,
      auditReferences: snap.auditReferences.length,
      rejectionChecks,
      uploadPolicyCode: uploadPolicy.policyCode,
    },
  };
}
