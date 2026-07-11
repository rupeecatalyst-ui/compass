/**
 * EDIE upload policy registry — configuration-driven upload policies and file types.
 */

import { EDIE_DEFAULT_FILE_TYPES } from "@/constants/enterprise-document-intelligence-engine";
import type { EdieRegisteredFileType, EdieUploadPolicy } from "@/types/enterprise-document-intelligence-engine";
import { recordEdieAudit } from "./audit-integration";
import { getEdiePorts } from "./composition";
import { validateEdieUploadPolicy } from "./validation-engine";

export function initializeEdieRegisteredFileTypes(): EdieRegisteredFileType[] {
  const existing = getEdiePorts().registeredFileTypes.list();
  if (existing.length > 0) return existing;

  return EDIE_DEFAULT_FILE_TYPES.map((config) => {
    const fileType: EdieRegisteredFileType = {
      id: crypto.randomUUID(),
      extension: config.extension,
      mimeType: config.mimeType,
      displayName: config.displayName,
      enabled: true,
      createdOn: new Date().toISOString(),
    };
    getEdiePorts().registeredFileTypes.save(fileType);
    return fileType;
  });
}

export function registerEdieFileType(
  input: Omit<EdieRegisteredFileType, "id" | "createdOn">,
): EdieRegisteredFileType {
  const duplicate = getEdiePorts().registeredFileTypes.findByExtension(input.extension);
  if (duplicate) throw new Error(`EDIE: file type "${input.extension}" already registered.`);

  const fileType: EdieRegisteredFileType = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  getEdiePorts().registeredFileTypes.save(fileType);
  return fileType;
}

export function registerEdieUploadPolicy(
  input: Omit<EdieUploadPolicy, "id" | "createdOn">,
): EdieUploadPolicy {
  const duplicate = getEdiePorts().uploadPolicies.findByCode(input.policyCode);
  if (duplicate) throw new Error(`EDIE: upload policy "${input.policyCode}" already exists.`);

  const policy: EdieUploadPolicy = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  const validation = validateEdieUploadPolicy(policy);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEdiePorts().uploadPolicies.save(policy);
  recordEdieAudit({
    entityId: policy.id,
    entityType: "upload_policy",
    action: "created",
    actorId: input.createdBy,
    remarks: `Registered upload policy ${policy.policyCode}`,
  });

  return policy;
}

export function validateEdieUploadAgainstPolicy(input: {
  policyCode: string;
  fileExtension: string;
  mimeType: string;
  fileSizeBytes: number;
}): void {
  const policy = getEdiePorts().uploadPolicies.findByCode(input.policyCode);
  if (!policy) throw new Error(`EDIE: upload policy "${input.policyCode}" not found.`);

  const validation = validateEdieUploadPolicy(
    policy,
    input.fileExtension,
    input.mimeType,
    input.fileSizeBytes,
  );
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));
}

export function listEdieUploadPolicies(): EdieUploadPolicy[] {
  return getEdiePorts().uploadPolicies.list();
}

export function listEdieRegisteredFileTypes(): EdieRegisteredFileType[] {
  return getEdiePorts().registeredFileTypes.list();
}
