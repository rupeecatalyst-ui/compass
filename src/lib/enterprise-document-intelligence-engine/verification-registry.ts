/**
 * EDIE verification registry — verification and validation tracking.
 */

import type {
  EdieDocumentValidation,
  EdieHashReference,
  EdieOcrReference,
  EdieAiExtractionReference,
  EdieDigitalSignatureReference,
  EdieVerification,
  EdieVerificationResult,
} from "@/types/enterprise-document-intelligence-engine";
import { recordEdieAudit } from "./audit-integration";
import { getEdiePorts } from "./composition";
import { appendEdieTimelineEntry } from "./timeline-registry";
import { validateEdieHashReference, validateEdieVerification } from "./validation-engine";

export function registerEdieVerification(
  input: Omit<EdieVerification, "id" | "createdOn">,
): EdieVerification {
  const verification: EdieVerification = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  const validation = validateEdieVerification(verification);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEdiePorts().verifications.save(verification);
  recordEdieAudit({
    entityId: verification.id,
    entityType: "verification",
    action: "created",
    actorId: input.createdBy,
    remarks: `Registered verification ${verification.verificationCode}`,
  });

  return verification;
}

export function recordEdieVerificationResult(
  input: Omit<EdieVerificationResult, "id" | "recordedOn">,
): EdieVerificationResult {
  if (!getEdiePorts().verifications.findById(input.verificationId)) {
    throw new Error(`EDIE: verification "${input.verificationId}" not found.`);
  }

  const result: EdieVerificationResult = {
    ...input,
    id: crypto.randomUUID(),
    recordedOn: new Date().toISOString(),
  };

  getEdiePorts().verificationResults.save(result);
  return result;
}

export function completeEdieVerification(input: {
  verificationId: string;
  verifiedBy: string;
  passed: boolean;
}): EdieVerification | undefined {
  const verification = getEdiePorts().verifications.findById(input.verificationId);
  if (!verification) return undefined;

  const updated: EdieVerification = {
    ...verification,
    status: input.passed ? "passed" : "failed",
    verifiedBy: input.verifiedBy,
    verifiedOn: new Date().toISOString(),
  };

  const validation = validateEdieVerification(updated);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEdiePorts().verifications.save(updated);
  appendEdieTimelineEntry({
    documentId: verification.documentId,
    eventType: "verified",
    title: "Verification Completed",
    description: `${verification.verificationCode}: ${updated.status}`,
    actorId: input.verifiedBy,
  });

  return updated;
}

export function registerEdieDocumentValidation(
  input: Omit<EdieDocumentValidation, "id">,
): EdieDocumentValidation {
  if (!getEdiePorts().documents.findById(input.documentId)) {
    throw new Error(`EDIE: document "${input.documentId}" not found.`);
  }

  const validation: EdieDocumentValidation = { ...input, id: crypto.randomUUID() };
  getEdiePorts().validations.save(validation);
  return validation;
}

export function registerEdieHashReference(
  input: Omit<EdieHashReference, "id" | "computedOn">,
): EdieHashReference {
  const hashRef: EdieHashReference = {
    ...input,
    id: crypto.randomUUID(),
    computedOn: new Date().toISOString(),
  };

  const validation = validateEdieHashReference(hashRef);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEdiePorts().hashReferences.save(hashRef);
  return hashRef;
}

export function registerEdieOcrReference(
  input: Omit<EdieOcrReference, "id" | "requestedOn">,
): EdieOcrReference {
  const reference: EdieOcrReference = {
    ...input,
    id: crypto.randomUUID(),
    requestedOn: new Date().toISOString(),
  };

  getEdiePorts().ocrReferences.save(reference);
  return reference;
}

export function registerEdieAiExtractionReference(
  input: Omit<EdieAiExtractionReference, "id" | "requestedOn">,
): EdieAiExtractionReference {
  const reference: EdieAiExtractionReference = {
    ...input,
    id: crypto.randomUUID(),
    requestedOn: new Date().toISOString(),
  };

  getEdiePorts().aiExtractionReferences.save(reference);
  return reference;
}

export function registerEdieDigitalSignatureReference(
  input: Omit<EdieDigitalSignatureReference, "id">,
): EdieDigitalSignatureReference {
  const reference: EdieDigitalSignatureReference = { ...input, id: crypto.randomUUID() };
  getEdiePorts().digitalSignatureReferences.save(reference);
  return reference;
}

export function listEdieVerifications(documentId: string): EdieVerification[] {
  return getEdiePorts().verifications.listByDocument(documentId);
}
