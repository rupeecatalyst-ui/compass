import type { CompassLodDto, CompassLodItemDto } from "@/types/compass-customer-gateway";
import { projectPartnerOpportunityLod } from "@/lib/enterprise-partner-lod/project";
import type { PartnerOpportunityDetailDto } from "@/types/enterprise-partner-business";
import type { PartnerLodItemStatus } from "@/types/enterprise-partner-lod";

const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_SIZE_BYTES = 15 * 1024 * 1024;

function mapUploadStatus(status: PartnerLodItemStatus): CompassLodItemDto["uploadStatus"] {
  switch (status) {
    case "uploaded":
      return "uploaded";
    case "pending_verification":
      return "pending_verification";
    case "rejected":
    case "re_upload_required":
      return "rejected";
    case "missing":
    default:
      return "missing";
  }
}

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
    explanation: item.moduleLabel || null,
    participantLabel: null,
    uploadStatus:
      item.documentId && item.status !== "missing" ? mapUploadStatus(item.status) : "missing",
    fileName: item.previewLabel,
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
