/**
 * CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014D
 * Canonical server-generated request-message DTO shared by Email and WhatsApp.
 * The browser may render this DTO but must not invent LOD requirements.
 */

import {
  DOCUMENT_WORKSPACE_CHECKLIST_BRAND,
  DOCUMENT_WORKSPACE_CHECKLIST_INSTRUCTION,
  DOCUMENT_WORKSPACE_CHECKLIST_NO_PROMISE,
  DOCUMENT_WORKSPACE_CHECKLIST_SPECIALIST_NOTE,
  DOCUMENT_WORKSPACE_INCOMPLETE_PROGRAMME_DISCLAIMER,
} from "@/constants/document-workspace-inbound";
import type { ChecklistSelectionItem } from "@/lib/document-workspace/checklist-selection";

export type DocumentWorkspaceRequestMessageChannel = "email" | "whatsapp";

export type DocumentWorkspaceRequestMessageGroup = {
  ownerLabel: string;
  ownerRoleLabel: string;
  ownerKind: ChecklistSelectionItem["ownerKind"];
  items: Array<{ requestRef: string; typeRef: string; label: string; mandatory: boolean }>;
};

export type DocumentWorkspaceRequestMessageDto = {
  organizationId: string;
  correlationId: string;
  generatedAt: string;
  channel: DocumentWorkspaceRequestMessageChannel;
  safeTransactionReference: string;
  product: string;
  customerDisplayName: string;
  customerFirstName: string | null;
  initiatingEmployeeId: string;
  programmeVersionRef: string | null;
  lodVersionId: string | null;
  incompleteProgrammeDisclaimer: string | null;
  groupedItems: DocumentWorkspaceRequestMessageGroup[];
  disclaimer: string;
  brand: string;
  instruction: string;
  specialistNote: string;
  selectedCount: number;
};

export function firstAuthorisedDisplayName(fullName: string | null | undefined): string | null {
  const token = String(fullName || "").trim().split(/\s+/)[0] || "";
  return token || null;
}

export function groupChecklistItemsForMessage(
  items: ChecklistSelectionItem[],
): DocumentWorkspaceRequestMessageGroup[] {
  const map = new Map<string, DocumentWorkspaceRequestMessageGroup>();
  for (const item of items) {
    const key = `${item.ownerKind}::${item.ownerRoleLabel}::${item.ownerLabel}`;
    const existing = map.get(key);
    const row = { requestRef: item.requestRef, typeRef: item.typeRef, label: item.label, mandatory: item.mandatory };
    if (existing) existing.items.push(row);
    else {
      map.set(key, {
        ownerLabel: item.ownerLabel,
        ownerRoleLabel: item.ownerRoleLabel,
        ownerKind: item.ownerKind,
        items: [row],
      });
    }
  }
  return [...map.values()];
}

export function buildDocumentWorkspaceRequestMessageDto(input: {
  organizationId: string;
  correlationId: string;
  generatedAt?: string;
  channel: DocumentWorkspaceRequestMessageChannel;
  safeTransactionReference: string;
  product: string;
  customerDisplayName: string;
  initiatingEmployeeId: string;
  programmeVersionRef?: string | null;
  lodVersionId?: string | null;
  incompleteProgramme?: boolean;
  items: ChecklistSelectionItem[];
}): DocumentWorkspaceRequestMessageDto {
  const groupedItems = groupChecklistItemsForMessage(input.items);
  return {
    organizationId: input.organizationId,
    correlationId: input.correlationId,
    generatedAt: input.generatedAt || new Date().toISOString(),
    channel: input.channel,
    safeTransactionReference: input.safeTransactionReference,
    product: input.product,
    customerDisplayName: input.customerDisplayName,
    customerFirstName: firstAuthorisedDisplayName(input.customerDisplayName),
    initiatingEmployeeId: input.initiatingEmployeeId,
    programmeVersionRef: input.programmeVersionRef ?? null,
    lodVersionId: input.lodVersionId ?? null,
    incompleteProgrammeDisclaimer: input.incompleteProgramme
      ? DOCUMENT_WORKSPACE_INCOMPLETE_PROGRAMME_DISCLAIMER
      : null,
    groupedItems,
    disclaimer: DOCUMENT_WORKSPACE_CHECKLIST_NO_PROMISE,
    brand: DOCUMENT_WORKSPACE_CHECKLIST_BRAND,
    instruction: DOCUMENT_WORKSPACE_CHECKLIST_INSTRUCTION,
    specialistNote: DOCUMENT_WORKSPACE_CHECKLIST_SPECIALIST_NOTE,
    selectedCount: input.items.length,
  };
}

export function formatRequestMessagePlainText(dto: DocumentWorkspaceRequestMessageDto): string {
  const greeting = dto.customerFirstName ? `Hello ${dto.customerFirstName}` : "Hello";
  const groups = dto.groupedItems.map((group) => {
    const lines = group.items.map((item) => `  • ${item.label}`).join("\n");
    return `${group.ownerRoleLabel} — ${group.ownerLabel}\n${lines}`;
  });
  const extra = dto.incompleteProgrammeDisclaimer ? `\n${dto.incompleteProgrammeDisclaimer}\n` : "";
  return [
    greeting,
    "",
    `${dto.brand} is requesting documents for ${dto.product} (${dto.safeTransactionReference}).`,
    "",
    groups.join("\n\n"),
    extra,
    dto.instruction,
    dto.specialistNote,
    dto.disclaimer,
  ]
    .filter((part) => part !== "")
    .join("\n");
}

export function messageContainsForbiddenHandoffContent(text: string): boolean {
  const lower = text.toLowerCase();
  if (lower.includes("uptok_")) return true;
  if (lower.includes("storagekey") || lower.includes("storage_key")) return true;
  if (lower.includes("/api/")) return true;
  if (lower.includes("bearer ")) return true;
  if (/\botp\b/i.test(text) && /\d{4,}/.test(text)) return true;
  return false;
}
