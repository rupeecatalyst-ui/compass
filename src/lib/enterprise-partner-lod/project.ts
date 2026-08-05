/**
 * CO-WP-LOD-001 — Project EDIE LOD for Catalyst Connect.
 * Single checklist SSOT: generateOpportunityLod (EDIE Certified).
 */

import { PARTNER_LOD_ENGINE_VERSION, PARTNER_LOD_PRESENTATION } from "@/constants/enterprise-partner-lod";
import {
  EdieLodCertificationError,
  generateOpportunityLod,
} from "@/lib/document-requests/generate-lod";
import type { PartnerOpportunityDetailDto } from "@/types/enterprise-partner-business";
import type {
  PartnerLodItemDto,
  PartnerLodItemStatus,
  PartnerOpportunityLodDto,
} from "@/types/enterprise-partner-lod";

const DTO_SOURCE = "enterprise_edie_lod" as const;
const DTO_NOTICE =
  "List of Documents projected from Catalyst One EDIE. Catalyst Connect must not invent or edit required document types.";

function mapBorrowerCategory(
  detail: PartnerOpportunityDetailDto,
): { borrowerCategory?: string; employmentType?: string; constitution?: string } {
  if (detail.primaryBorrowerKind === "company") {
    return {
      borrowerCategory: "company",
      constitution: detail.borrowerFields?.constitution?.trim() || undefined,
    };
  }
  return {
    employmentType: detail.borrowerFields?.employmentTypeCode?.trim() || undefined,
    constitution: detail.borrowerFields?.constitution?.trim() || undefined,
  };
}

function mapTransactionType(
  detail: PartnerOpportunityDetailDto,
): "fresh" | "balance_transfer" | null {
  const raw = (detail.productFields?.transactionType || "").trim().toLowerCase();
  if (raw === "balance_transfer") return "balance_transfer";
  if (raw === "fresh") return "fresh";
  return "fresh";
}

function statusFromUpload(statusLabel: string | undefined): PartnerLodItemStatus {
  const s = (statusLabel || "").toLowerCase();
  if (s.includes("reject")) return "rejected";
  if (s.includes("re-upload") || s.includes("reupload")) return "re_upload_required";
  if (s.includes("verif") || s.includes("pending")) return "pending_verification";
  if (s.includes("upload") || s.includes("received") || s.includes("complete")) return "uploaded";
  return "uploaded";
}

export type ProjectPartnerLodOptions = {
  /** Soft display context from Recommendation Engine (does not invent documents). */
  recommendationTitle?: string | null;
};

/**
 * Build Partner LOD from Opportunity detail + uploaded document stubs.
 * Uploads are matched by typeRef (preferred) or label/title fuzzy match (legacy stubs).
 */
export function projectPartnerOpportunityLod(
  detail: PartnerOpportunityDetailDto,
  opts?: ProjectPartnerLodOptions,
): PartnerOpportunityLodDto {
  const presentation = { ...PARTNER_LOD_PRESENTATION };
  const generatedAt = new Date().toISOString();
  const productLabel = detail.productLabel || detail.productCode || "";
  const borrower = mapBorrowerCategory(detail);
  const transactionType = mapTransactionType(detail);
  const borrowerType =
    detail.primaryBorrowerKind === "company"
      ? "Company"
      : detail.primaryBorrowerKind === "individual"
        ? "Individual"
        : "Not Specified";

  const baseContext = {
    productLabel: productLabel || "Not Specified",
    borrowerType,
    recommendationTitle: opts?.recommendationTitle?.trim() || null,
  };

  try {
    const lodItems = generateOpportunityLod({
      productLabel: detail.productCode || productLabel,
      employmentType: borrower.employmentType,
      borrowerCategory: borrower.borrowerCategory,
      constitution: borrower.constitution,
      transactionType,
    });

    const docs = detail.documents ?? [];
    const items: PartnerLodItemDto[] = lodItems.map((item, index) => {
      const match =
        docs.find((d) => (d as { typeRef?: string }).typeRef === item.typeRef) ||
        docs.find(
          (d) =>
            d.categoryLabel?.toLowerCase() === item.label.toLowerCase() ||
            d.title?.toLowerCase() === item.label.toLowerCase() ||
            d.title?.toLowerCase().includes(item.label.toLowerCase()),
        );

      let status: PartnerLodItemStatus = "missing";
      if (match) status = statusFromUpload(match.statusLabel);
      const missing = status === "missing" || status === "re_upload_required" || status === "rejected";
      const isDraft = (detail.lifecycleStatus || "").toLowerCase() === "draft";
      const matchDoc = match as
        | (typeof match & { uploadedByLabel?: string | null })
        | undefined;

      return {
        typeRef: item.typeRef,
        label: item.label,
        moduleId: item.moduleId,
        moduleLabel: item.moduleLabel,
        category: item.category,
        mandatory: item.mandatory,
        critical: item.critical,
        status,
        missing,
        canUpload: status === "missing" || status === "rejected" || status === "re_upload_required",
        canReplace: Boolean(match) && (status === "uploaded" || status === "pending_verification"),
        canPreview: Boolean(match),
        canDelete: Boolean(match?.documentId) && isDraft,
        documentId: match?.documentId ?? null,
        previewLabel: match
          ? `${match.fileName || match.title} · ${match.statusLabel}${
              match.sizeBytes ? ` · ${Math.round(match.sizeBytes / 1024)} KB` : ""
            }`
          : null,
        uploadedAt: match?.updatedAt ?? null,
        uploadedByLabel: matchDoc?.uploadedByLabel?.trim() || (match ? "Wealth Partner" : null),
        sortOrder: index + 1,
        previewDataUrl: match?.previewDataUrl ?? null,
      };
    });

    const required = items.filter((i) => i.mandatory || i.critical).length || items.length;
    const uploaded = items.filter((i) => i.status === "uploaded" || i.status === "pending_verification")
      .length;
    const missing = items.filter((i) => i.missing).length;
    const rejected = items.filter((i) => i.status === "rejected").length;
    const pending = items.filter((i) => i.status === "pending_verification").length;

    const guidance = [];
    if (baseContext.recommendationTitle) {
      guidance.push({
        id: "recommendation_context",
        message: `Checklist aligned to your suggested programme: ${baseContext.recommendationTitle}.`,
      });
    }

    return {
      version: PARTNER_LOD_ENGINE_VERSION,
      dtoSource: DTO_SOURCE,
      dtoNotice: DTO_NOTICE,
      opportunityId: detail.opportunityId,
      ready: true,
      generatedAt,
      presentation,
      guidance,
      items,
      summary: { required, uploaded, missing, rejected, pending },
      context: baseContext,
    };
  } catch (err) {
    const message =
      err instanceof EdieLodCertificationError
        ? err.message
        : err instanceof Error
          ? err.message
          : presentation.emptyMessage;

    return {
      version: PARTNER_LOD_ENGINE_VERSION,
      dtoSource: DTO_SOURCE,
      dtoNotice: DTO_NOTICE,
      opportunityId: detail.opportunityId,
      ready: false,
      generatedAt,
      presentation,
      guidance: [{ id: "lod_not_ready", message }],
      items: [],
      summary: { required: 0, uploaded: 0, missing: 0, rejected: 0, pending: 0 },
      context: baseContext,
    };
  }
}

/** Missing mandatory/critical labels for health / NBA — from EDIE LOD only. */
export function listPartnerLodMissingLabels(lod: PartnerOpportunityLodDto): string[] {
  return lod.items.filter((i) => i.missing && (i.mandatory || i.critical)).map((i) => i.label);
}
