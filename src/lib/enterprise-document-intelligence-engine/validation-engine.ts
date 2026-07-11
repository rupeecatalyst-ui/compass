/**
 * EDIE validation engine.
 */

import {
  EDIE_DOCUMENT_LIFECYCLE_TRANSITIONS,
} from "@/constants/enterprise-document-intelligence-engine";
import type {
  EdieDocumentChecklist,
  EdieDocumentLifecycleStatus,
  EdieDocumentMasterRecord,
  EdieDocumentRelationship,
  EdieDocumentVersion,
  EdieExpiryPolicy,
  EdieHashReference,
  EdieRetentionPolicy,
  EdieUploadPolicy,
  EdieVerification,
  EdieValidationIssue,
  EdieValidationResult,
} from "@/types/enterprise-document-intelligence-engine";
import type { EdieDocumentRepositoryPort } from "@/types/enterprise-document-intelligence-engine-ports";
import { getEdiePorts } from "./composition";

function issue(
  code: string,
  severity: EdieValidationIssue["severity"],
  message: string,
  entityRef?: string,
): EdieValidationIssue {
  return { code, severity, message, entityRef };
}

export function validateEdieDocumentLifecycleTransition(
  from: EdieDocumentLifecycleStatus,
  to: EdieDocumentLifecycleStatus,
): void {
  const allowed = EDIE_DOCUMENT_LIFECYCLE_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`EDIE validation: cannot transition document lifecycle from "${from}" to "${to}".`);
  }
}

export function validateEdieDocumentCodeUniqueness(
  repo: EdieDocumentRepositoryPort,
  documentCode: string,
  tenantId?: string,
  excludeId?: string,
): void {
  const duplicate = repo
    .list()
    .find(
      (d) =>
        d.documentCode === documentCode &&
        d.id !== excludeId &&
        (tenantId === undefined || d.tenantId === tenantId),
    );
  if (duplicate) {
    throw new Error(`EDIE validation: document code "${documentCode}" already exists.`);
  }
}

export function validateEdieDocument(
  repo: EdieDocumentRepositoryPort,
  document: EdieDocumentMasterRecord,
  existing?: EdieDocumentMasterRecord,
): EdieValidationResult {
  const issues: EdieValidationIssue[] = [];

  try {
    validateEdieDocumentCodeUniqueness(repo, document.documentCode, document.tenantId, existing?.id);
  } catch (err) {
    issues.push(
      issue("EDIE_DUPLICATE_DOCUMENT", "error", err instanceof Error ? err.message : String(err), document.id),
    );
  }

  if (existing && existing.enterpriseDocumentId !== document.enterpriseDocumentId) {
    issues.push(
      issue("EDIE_IMMUTABLE_DOCUMENT_ID", "error", "Enterprise Document ID is immutable.", document.id),
    );
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEdieDocumentVersion(version: EdieDocumentVersion): EdieValidationResult {
  const issues: EdieValidationIssue[] = [];

  const document = getEdiePorts().documents.findById(version.documentId);
  if (!document) {
    issues.push(issue("EDIE_INVALID_VERSION", "error", "Version references unknown document.", version.id));
  } else if (document.enterpriseDocumentId !== version.enterpriseDocumentId) {
    issues.push(
      issue("EDIE_INVALID_VERSION", "error", "Version enterpriseDocumentId must match document.", version.id),
    );
  }

  const duplicate = getEdiePorts().versions.findByDocumentAndVersion(
    version.documentId,
    version.versionMajor,
    version.versionMinor,
  );
  if (duplicate && duplicate.id !== version.id) {
    issues.push(issue("EDIE_INVALID_VERSION", "error", "Document version already exists.", version.id));
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEdieHashReference(hashRef: EdieHashReference): EdieValidationResult {
  const issues: EdieValidationIssue[] = [];

  if (!getEdiePorts().documents.findById(hashRef.documentId)) {
    issues.push(issue("EDIE_INVALID_HASH", "error", "Hash references unknown document.", hashRef.id));
  }

  const duplicate = getEdiePorts().hashReferences.findByHashValue(hashRef.hashValue);
  if (duplicate && duplicate.id !== hashRef.id) {
    issues.push(issue("EDIE_DUPLICATE_HASH", "error", "Hash value already registered.", hashRef.id));
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEdieDocumentRelationship(
  relationship: EdieDocumentRelationship,
): EdieValidationResult {
  const issues: EdieValidationIssue[] = [];

  const source = getEdiePorts().documents.findById(relationship.sourceDocumentId);
  const target = getEdiePorts().documents.findById(relationship.targetDocumentId);
  if (!source) {
    issues.push(issue("EDIE_INVALID_RELATIONSHIP", "error", "Source document not found.", relationship.id));
  }
  if (!target) {
    issues.push(issue("EDIE_INVALID_RELATIONSHIP", "error", "Target document not found.", relationship.id));
  }

  if (relationship.sourceDocumentId === relationship.targetDocumentId) {
    issues.push(
      issue("EDIE_INVALID_RELATIONSHIP", "error", "Document cannot relate to itself.", relationship.id),
    );
  }

  const cycles = detectEdieRelationshipCycles(relationship);
  for (const cycle of cycles) {
    issues.push(
      issue("EDIE_CIRCULAR_RELATIONSHIP", "error", `Circular relationship: ${cycle.join(" → ")}.`, relationship.id),
    );
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

function detectEdieRelationshipCycles(relationship: EdieDocumentRelationship): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const path = [relationship.sourceDocumentId, relationship.targetDocumentId];

  function dfs(currentId: string): void {
    if (visited.has(currentId)) {
      const start = path.indexOf(currentId);
      if (start >= 0) cycles.push([...path.slice(start), currentId]);
      return;
    }
    visited.add(currentId);
    const outgoing = getEdiePorts()
      .relationships.listBySource(currentId)
      .filter((r) => r.enabled && r.id !== relationship.id);
    for (const rel of outgoing) {
      path.push(rel.targetDocumentId);
      dfs(rel.targetDocumentId);
      path.pop();
    }
  }

  dfs(relationship.targetDocumentId);
  return cycles;
}

export function validateEdieChecklist(checklist: EdieDocumentChecklist): EdieValidationResult {
  const issues: EdieValidationIssue[] = [];

  const duplicate = getEdiePorts()
    .checklists.list()
    .find((c) => c.checklistCode === checklist.checklistCode && c.id !== checklist.id && c.enabled);
  if (duplicate) {
    issues.push(issue("EDIE_INVALID_CHECKLIST", "error", "Checklist code already exists.", checklist.id));
  }

  const items = getEdiePorts().checklistItems.listByChecklist(checklist.id);
  const requiredItems = items.filter((i) => i.required && i.enabled);
  if (items.length > 0 && requiredItems.length === 0) {
    issues.push(
      issue("EDIE_INVALID_CHECKLIST", "warning", "Checklist has no required items.", checklist.id),
    );
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEdieVerification(verification: EdieVerification): EdieValidationResult {
  const issues: EdieValidationIssue[] = [];

  if (!getEdiePorts().documents.findById(verification.documentId)) {
    issues.push(issue("EDIE_INVALID_VERIFICATION", "error", "Document not found.", verification.id));
  }

  if (verification.status === "passed" && !verification.verifiedOn) {
    issues.push(
      issue("EDIE_VERIFICATION_INCONSISTENT", "error", "Passed verification requires verifiedOn.", verification.id),
    );
  }
  if (verification.status === "passed" && !verification.verifiedBy) {
    issues.push(
      issue("EDIE_VERIFICATION_INCONSISTENT", "error", "Passed verification requires verifiedBy.", verification.id),
    );
  }

  const results = getEdiePorts().verificationResults.listByVerification(verification.id);
  if (verification.status === "passed" && results.some((r) => !r.passed)) {
    issues.push(
      issue("EDIE_VERIFICATION_INCONSISTENT", "error", "Passed verification has failed results.", verification.id),
    );
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEdieRetentionPolicy(policy: EdieRetentionPolicy): EdieValidationResult {
  const issues: EdieValidationIssue[] = [];

  if (policy.retentionDays <= 0) {
    issues.push(issue("EDIE_INVALID_RETENTION", "error", "Retention days must be positive.", policy.id));
  }
  if (policy.archiveAfterDays !== undefined && policy.archiveAfterDays > policy.retentionDays) {
    issues.push(
      issue("EDIE_INVALID_RETENTION", "error", "Archive days cannot exceed retention days.", policy.id),
    );
  }
  if (policy.destroyAfterDays !== undefined && policy.retentionDays > policy.destroyAfterDays) {
    issues.push(
      issue("EDIE_INVALID_RETENTION", "error", "Destroy days must exceed retention days.", policy.id),
    );
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEdieExpiryPolicy(policy: EdieExpiryPolicy): EdieValidationResult {
  const issues: EdieValidationIssue[] = [];

  if (policy.expiryDays <= 0) {
    issues.push(issue("EDIE_INVALID_EXPIRY", "error", "Expiry days must be positive.", policy.id));
  }
  if (policy.warningDays !== undefined && policy.warningDays >= policy.expiryDays) {
    issues.push(
      issue("EDIE_INVALID_EXPIRY", "error", "Warning days must be less than expiry days.", policy.id),
    );
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEdieUploadPolicy(
  policy: EdieUploadPolicy,
  fileExtension?: string,
  mimeType?: string,
  fileSizeBytes?: number,
): EdieValidationResult {
  const issues: EdieValidationIssue[] = [];

  if (policy.maxFileSizeBytes <= 0) {
    issues.push(issue("EDIE_INVALID_UPLOAD_POLICY", "error", "Max file size must be positive.", policy.id));
  }

  if (fileSizeBytes !== undefined && fileSizeBytes > policy.maxFileSizeBytes) {
    issues.push(
      issue("EDIE_UPLOAD_POLICY_VIOLATION", "error", `File size exceeds maximum (${policy.maxFileSizeBytes}).`, policy.id),
    );
  }

  if (fileExtension !== undefined) {
    const ext = fileExtension.toLowerCase().replace(/^\./, "");
    if (policy.allowedFileExtensions.length > 0 && !policy.allowedFileExtensions.includes(ext)) {
      issues.push(
        issue("EDIE_UPLOAD_POLICY_VIOLATION", "error", `Extension "${ext}" not allowed.`, policy.id),
      );
    }
  }

  if (mimeType !== undefined) {
    if (policy.allowedMimeTypes.length > 0 && !policy.allowedMimeTypes.includes(mimeType)) {
      issues.push(
        issue("EDIE_UPLOAD_POLICY_VIOLATION", "error", `MIME type "${mimeType}" not allowed.`, policy.id),
      );
    }
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}
