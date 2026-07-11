/**
 * EDIE registry snapshot.
 */

import { EDIE_FRAMEWORK_VERSION } from "@/constants/enterprise-document-intelligence-engine";
import type { EdieRegistrySnapshot } from "@/types/enterprise-document-intelligence-engine";
import { getEdiePorts } from "./composition";

export function getEdieFrameworkVersion(): string {
  return EDIE_FRAMEWORK_VERSION;
}

export function getEdieRegistrySnapshot(): EdieRegistrySnapshot {
  const ports = getEdiePorts();
  return {
    enterpriseDocumentIds: ports.enterpriseDocumentIds.list(),
    documentTypes: ports.documentTypes.list(),
    documents: ports.documents.list(),
    documentProfiles: ports.documentProfiles.list(),
    versions: ports.versions.list(),
    revisions: ports.revisions.list(),
    metadata: ports.metadata.list(),
    ownerReferences: ports.ownerReferences.list(),
    subjectReferences: ports.subjectReferences.list(),
    relationships: ports.relationships.list(),
    checklists: ports.checklists.list(),
    checklistItems: ports.checklistItems.list(),
    requirements: ports.requirements.list(),
    verifications: ports.verifications.list(),
    verificationResults: ports.verificationResults.list(),
    validations: ports.validations.list(),
    ocrReferences: ports.ocrReferences.list(),
    aiExtractionReferences: ports.aiExtractionReferences.list(),
    digitalSignatureReferences: ports.digitalSignatureReferences.list(),
    hashReferences: ports.hashReferences.list(),
    retentionPolicies: ports.retentionPolicies.list(),
    expiryPolicies: ports.expiryPolicies.list(),
    archivePolicies: ports.archivePolicies.list(),
    uploadPolicies: ports.uploadPolicies.list(),
    registeredFileTypes: ports.registeredFileTypes.list(),
    storageReferences: ports.storageReferences.list(),
    timelineEntries: ports.timeline.list(),
    auditReferences: ports.auditReferences.list(),
  };
}
