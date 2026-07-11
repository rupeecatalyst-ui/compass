/**
 * EME audit integration — reuses Sprint 1 EAF audit infrastructure.
 */

import { appendEafAuditEntry } from "@/lib/enterprise-asset-framework";

export type EmeMetadataAuditAction =
  | "metadata_created"
  | "metadata_modified"
  | "field_created"
  | "field_modified"
  | "category_created"
  | "category_modified"
  | "validation_rule_modified";

export function recordEmeMetadataAudit(input: {
  metadataDefinitionId: string;
  action: EmeMetadataAuditAction;
  actorId: string;
  changeSetRef?: string;
  remarks?: string;
}): void {
  appendEafAuditEntry({
    assetId: input.metadataDefinitionId,
    action: "modified",
    actorId: input.actorId,
    changeSetRef: input.changeSetRef ?? input.action,
    remarks: input.remarks,
  });
}
