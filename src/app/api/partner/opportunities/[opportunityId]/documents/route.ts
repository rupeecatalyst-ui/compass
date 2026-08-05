import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { PartnerGatewayError } from "@server/services/partner-gateway/partner-auth.service";
import { partnerBusinessService } from "@server/services/partner-gateway/partner-business.service";
import type { PartnerOpportunityDocumentUploadInput } from "@/types/enterprise-partner-business";

type Ctx = { params: Promise<{ opportunityId: string }> };

const MAX_BYTES = 8 * 1024 * 1024;

/**
 * CO-WP-LOD-001 / CO-WP-UPLOAD-001 — Enterprise LOD documents for Catalyst Connect.
 * Accepts JSON or multipart (camera / gallery / drag-drop files). No folder trees.
 */
export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request, context: Ctx) {
  try {
    const actor = requirePartnerAccessToken(request);
    const { opportunityId } = await context.params;
    const id = decodeURIComponent(opportunityId);
    const lod = await partnerBusinessService.getLod(actor.userId, id);
    const documents = await partnerBusinessService.listDocuments(actor.userId, id);
    return partnerSuccess(request, { lod, documents });
  } catch (err) {
    return partnerError(request, err);
  }
}

async function readUploadInput(request: Request): Promise<PartnerOpportunityDocumentUploadInput> {
  const contentType = (request.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const typeRef = String(form.get("typeRef") || "").trim();
    const replaceDocumentId = String(form.get("replaceDocumentId") || "").trim() || undefined;
    const title = String(form.get("title") || "").trim() || undefined;
    const append = String(form.get("append") || "") === "1" || String(form.get("append") || "") === "true";
    const file = form.get("file");
    if (!(file instanceof File)) {
      return { typeRef, title, replaceDocumentId, append };
    }
    if (file.size > MAX_BYTES) {
      throw new PartnerGatewayError("Each file must be 8 MB or smaller.", "VALIDATION", 400);
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentBase64 = `data:${file.type || "application/octet-stream"};base64,${buffer.toString("base64")}`;
    return {
      typeRef,
      title: title || file.name,
      replaceDocumentId,
      append,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      contentBase64,
    };
  }

  return (await request.json().catch(() => ({}))) as PartnerOpportunityDocumentUploadInput;
}

export async function POST(request: Request, context: Ctx) {
  try {
    const actor = requirePartnerAccessToken(request);
    const { opportunityId } = await context.params;
    const body = await readUploadInput(request);
    const detail = await partnerBusinessService.uploadDocument(
      actor.userId,
      decodeURIComponent(opportunityId),
      body,
    );
    return partnerSuccess(request, detail, 201);
  } catch (err) {
    return partnerError(request, err);
  }
}

/** Delete an uploaded LOD document — draft Opportunities only. */
export async function DELETE(request: Request, context: Ctx) {
  try {
    const actor = requirePartnerAccessToken(request);
    const { opportunityId } = await context.params;
    const url = new URL(request.url);
    const documentId = (url.searchParams.get("documentId") || "").trim();
    const detail = await partnerBusinessService.deleteDocument(
      actor.userId,
      decodeURIComponent(opportunityId),
      documentId,
    );
    return partnerSuccess(request, detail);
  } catch (err) {
    return partnerError(request, err);
  }
}
