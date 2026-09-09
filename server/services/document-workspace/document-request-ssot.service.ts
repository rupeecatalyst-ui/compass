/**
 * Server-authoritative Document Request SSOT.
 * Reuses EnterpriseDocumentCustomerRequest — not a second document store.
 * Never writes Deal lenderProgramId / programme version stamps.
 */
import { prisma } from "@server/lib/prisma";
import { DOCUMENT_REQUEST_LINK_EXPIRY_DAYS } from "@/constants/document-requests";
import { getDocumentRequestRef } from "@/lib/document-requests/lod-versioning";
import {
  ownerKindFromRole,
  type ChecklistSelectionItem,
} from "@/lib/document-workspace/checklist-selection";
import type { DocumentRequestItemState } from "@/types/document-requests";

export const DOCUMENT_REQUEST_KIND_LOD_CHECKLIST = "lod_checklist";
export const DOCUMENT_REQUEST_KIND_CUSTOMER_COLLECTION = "customer_collection";

function defaultExpiry() {
  return new Date(Date.now() + DOCUMENT_REQUEST_LINK_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

export function mapDurableItemToLodState(row: {
  requestRef: string;
  typeRef: string;
  categoryLabel: string;
  status: string;
  registryRecordId: string | null;
  participantId: string | null;
  ownerKind: string | null;
  ownerLabel: string | null;
  label: string | null;
  mandatory: boolean;
}): DocumentRequestItemState {
  return {
    requestRef: row.requestRef,
    typeRef: row.typeRef,
    label: row.label || row.categoryLabel,
    category: "journey",
    moduleId: "server_ssot",
    moduleLabel: "Document Request",
    mandatory: row.mandatory,
    critical: false,
    participantId: row.participantId || undefined,
    ownerName: row.ownerLabel || undefined,
    ownerRoleLabel: row.ownerKind || undefined,
    ownerTypeLabel: row.ownerKind || undefined,
    status: (row.status as DocumentRequestItemState["status"]) || "pending",
    registryRecordId: row.registryRecordId || undefined,
  };
}

export async function loadLodChecklistRequest(input: {
  organizationId: string;
  opportunityId: string;
  dealId?: string | null;
}) {
  return prisma.enterpriseDocumentCustomerRequest.findFirst({
    where: {
      organizationId: input.organizationId,
      opportunityId: input.opportunityId,
      requestKind: DOCUMENT_REQUEST_KIND_LOD_CHECKLIST,
      status: "open",
      revokedAt: null,
      ...(input.dealId ? { dealId: input.dealId } : { dealId: null }),
    },
    include: { items: true },
    orderBy: { requestVersion: "desc" },
  });
}

export async function persistLodChecklistItems(input: {
  organizationId: string;
  opportunityId: string;
  dealId?: string | null;
  actorUserId: string;
  partyEntityId: string;
  lodItems: DocumentRequestItemState[];
  lodVersionId: string | null;
  programmeVersionRef: string | null;
}) {
  const existing = await loadLodChecklistRequest(input);
  const lodVersionId =
    input.lodVersionId ||
    existing?.lodVersionId ||
    `lod:${input.opportunityId}:v${(existing?.requestVersion || 0) + 1}`;
  const now = new Date();

  if (!existing) {
    const created = await prisma.enterpriseDocumentCustomerRequest.create({
      data: {
        organizationId: input.organizationId,
        opportunityId: input.opportunityId,
        dealId: input.dealId ?? null,
        partyEntityId: input.partyEntityId,
        partyEntityKind: "contact",
        status: "open",
        requestKind: DOCUMENT_REQUEST_KIND_LOD_CHECKLIST,
        requestVersion: 1,
        lodVersionId,
        programmeVersionRef: input.programmeVersionRef,
        generatedAt: now,
        createdByUserId: input.actorUserId,
        expiresAt: defaultExpiry(),
        items: {
          create: input.lodItems.map((item) => ({
            organizationId: input.organizationId,
            typeRef: item.typeRef,
            categoryLabel: item.label,
            requestRef: getDocumentRequestRef(item),
            status: item.status || "pending",
            participantId: item.participantId || null,
            ownerKind: ownerKindFromRole(item.ownerRoleLabel || "", item.ownerTypeLabel),
            ownerLabel: item.ownerName || null,
            label: item.label,
            mandatory: item.mandatory,
            lodVersionId,
            programmeVersionRef: input.programmeVersionRef,
          })),
        },
        audits: {
          create: {
            organizationId: input.organizationId,
            action: "lod_checklist_generated",
            actorUserId: input.actorUserId,
            detail: JSON.stringify({
              itemCount: input.lodItems.length,
              lodVersionId,
              programmeVersionRef: input.programmeVersionRef,
            }),
          },
        },
      },
      include: { items: true },
    });
    return created;
  }

  const existingRefs = new Set(existing.items.map((row) => row.requestRef));
  const creates = input.lodItems.filter((item) => !existingRefs.has(getDocumentRequestRef(item)));
  if (creates.length) {
    await prisma.enterpriseDocumentCustomerRequestItem.createMany({
      data: creates.map((item) => ({
        organizationId: input.organizationId,
        requestId: existing.id,
        typeRef: item.typeRef,
        categoryLabel: item.label,
        requestRef: getDocumentRequestRef(item),
        status: item.status || "pending",
        participantId: item.participantId || null,
        ownerKind: ownerKindFromRole(item.ownerRoleLabel || "", item.ownerTypeLabel),
        ownerLabel: item.ownerName || null,
        label: item.label,
        mandatory: item.mandatory,
        lodVersionId: existing.lodVersionId || lodVersionId,
        programmeVersionRef: existing.programmeVersionRef || input.programmeVersionRef,
      })),
    });
  }

  const updated = await prisma.enterpriseDocumentCustomerRequest.update({
    where: { id: existing.id },
    data: {
      generatedAt: existing.generatedAt ?? now,
      lodVersionId: existing.lodVersionId || lodVersionId,
      programmeVersionRef: existing.programmeVersionRef || input.programmeVersionRef,
    },
    include: { items: true },
  });
  return updated;
}

export async function overlayDurableItemStatuses(input: {
  organizationId: string;
  requestId: string;
  updates: Array<{ requestRef: string; status: string; registryRecordId?: string | null }>;
}) {
  for (const row of input.updates) {
    await prisma.enterpriseDocumentCustomerRequestItem.updateMany({
      where: {
        organizationId: input.organizationId,
        requestId: input.requestId,
        requestRef: row.requestRef,
      },
      data: {
        status: row.status,
        ...(row.registryRecordId !== undefined ? { registryRecordId: row.registryRecordId } : {}),
      },
    });
  }
}

export async function loadAuthoritativeSelectedItems(input: {
  organizationId: string;
  opportunityId: string;
  dealId?: string | null;
  selectedRefs: string[];
}): Promise<ChecklistSelectionItem[] | null> {
  const request = await loadLodChecklistRequest(input);
  if (!request || request.revokedAt) return null;
  const wanted = new Set(input.selectedRefs);
  const rows = request.items.filter((item) => wanted.has(item.requestRef));
  if (rows.length !== wanted.size) return null;
  return rows.map((item) => ({
    requestRef: item.requestRef,
    typeRef: item.typeRef,
    label: item.label || item.categoryLabel,
    ownerLabel: item.ownerLabel || "Shared Transaction",
    ownerRoleLabel: item.ownerKind || "Owner",
    ownerKind: (item.ownerKind as ChecklistSelectionItem["ownerKind"]) || "applicant",
    status: item.status,
    mandatory: item.mandatory,
    opportunityId: input.opportunityId,
    dealId: input.dealId ?? null,
    organizationId: input.organizationId,
    lodVersionId: item.lodVersionId || request.lodVersionId,
    programmeVersionRef: item.programmeVersionRef || request.programmeVersionRef,
  }));
}

export async function markLodChecklistShared(input: {
  organizationId: string;
  opportunityId: string;
  dealId?: string | null;
  channel: "email" | "whatsapp";
  queued?: boolean;
}) {
  const request = await loadLodChecklistRequest(input);
  if (!request) return;
  await prisma.enterpriseDocumentCustomerRequest.update({
    where: { id: request.id },
    data: {
      sharedAt: new Date(),
      sharedChannel: input.channel,
      ...(input.queued ? { queuedAt: new Date() } : {}),
    },
  });
}
