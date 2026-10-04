import type { CompassLodDto, CompassLodItemDto } from "@/types/compass-customer-gateway";
import { projectPartnerOpportunityLod } from "@/lib/enterprise-partner-lod/project";
import { customerChecklistStatus } from "@/lib/compass-customer-gateway/customer-lod-status";
import type { PartnerOpportunityDetailDto } from "@/types/enterprise-partner-business";

const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_SIZE_BYTES = 15 * 1024 * 1024;

export function projectCompassLod(detail: PartnerOpportunityDetailDto): CompassLodDto {
  const partnerLod = projectPartnerOpportunityLod(detail, {
    contactChannelPolicy: "compass_public",
  });
  const items: CompassLodItemDto[] = partnerLod.items.map((item) => ({
    itemId: item.typeRef,
    typeRef: item.typeRef,
    label: item.label,
    mandatory: item.mandatory,
    conditional: !item.mandatory && item.critical,
    participantLabel: null,
    uploadStatus:
      item.documentId && item.status !== "missing" ? customerChecklistStatus(item.status) : "missing",
    fileName: item.fileName?.trim() || null,
    explanation:
      item.status === "rejected" || item.status === "re_upload_required"
        ? "Please upload this document again."
        : item.moduleLabel || null,
    allowedMimeTypes: ALLOWED_MIME,
    maxSizeBytes: MAX_SIZE_BYTES,
  }));

  const mandatory = items.filter((i) => i.mandatory);
  const mandatoryPending = mandatory.filter((i) => i.uploadStatus === "missing").length;
  const uploaded = items.filter((i) => i.uploadStatus !== "missing").length;
  const completionPercent =
    items.length === 0
      ? 0
      : mandatory.length === 0
        ? 100
        : Math.round(((mandatory.length - mandatoryPending) / mandatory.length) * 100);

  return {
    items,
    completionPercent,
    mandatoryPending,
    dtoSource: "enterprise_compass_lod",
  };
}
