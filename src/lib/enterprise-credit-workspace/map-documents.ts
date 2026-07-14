/**
 * ECW helpers — presentation mapping only.
 */

import type { LoanFile, LoanFileDocument } from "@/types/catalyst-one";
import type { EcwViewerDocument } from "@/types/enterprise-credit-workspace";

/** Sample PDF for in-workspace viewing (Mozilla PDF.js demo). */
export const ECW_SAMPLE_PDF_URL =
  "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf";

/** Lightweight SVG stand-in for image documents (no download required). */
export const ECW_SAMPLE_IMAGE_DATA_URL =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1100" viewBox="0 0 800 1100">
  <rect width="800" height="1100" fill="#f8fafc"/>
  <rect x="48" y="48" width="704" height="1004" rx="12" fill="#fff" stroke="#cbd5e1"/>
  <text x="400" y="120" text-anchor="middle" font-family="Segoe UI,sans-serif" font-size="28" fill="#0f172a">Document Preview</text>
  <text x="400" y="170" text-anchor="middle" font-family="Segoe UI,sans-serif" font-size="16" fill="#64748b">In-workspace image viewer · no download required</text>
  <rect x="120" y="240" width="560" height="320" rx="8" fill="#e2e8f0"/>
  <text x="400" y="780" text-anchor="middle" font-family="Segoe UI,sans-serif" font-size="14" fill="#94a3b8">Catalyst One · Enterprise Credit Workspace</text>
</svg>`);

function inferPreviewKind(name: string): EcwViewerDocument["previewKind"] {
  const n = name.toLowerCase();
  if (n.includes("photo") || n.includes("image") || n.includes("selfie") || n.includes("aadhaar")) {
    return "image";
  }
  if (n.includes("excel") || n.includes("word") || n.includes("sheet")) return "office";
  if (
    n.includes("statement") ||
    n.includes("itr") ||
    n.includes("pan") ||
    n.includes("form") ||
    n.includes("agreement") ||
    n.includes("sanction") ||
    n.includes("pdf")
  ) {
    return "pdf";
  }
  return "pdf";
}

function verificationLabel(status: LoanFileDocument["status"]): string {
  switch (status) {
    case "verified":
      return "Verified";
    case "rejected":
      return "Rejected";
    case "received":
      return "Pending verification";
    case "requested":
      return "Awaiting upload";
    case "pending":
    default:
      return "Not verified";
  }
}

export function mapLoanDocumentsToEcwViewerDocs(
  documents: LoanFileDocument[],
  fallbackUploader: string,
): EcwViewerDocument[] {
  return documents.map((d) => {
    const kind = inferPreviewKind(d.name);
    return {
      id: d.id,
      name: d.name,
      status: d.status,
      uploadedAt: d.receivedDate ?? d.updatedAt ?? d.createdAt,
      uploadedBy: d.updatedBy ?? d.createdBy ?? fallbackUploader,
      verificationStatus: verificationLabel(d.status),
      category: d.category,
      previewKind: kind,
      previewUrl: kind === "image" ? ECW_SAMPLE_IMAGE_DATA_URL : ECW_SAMPLE_PDF_URL,
    };
  });
}

export function resolveEcwSelectedLender(file: LoanFile): {
  lenderName: string;
  contactName: string;
  enabled: boolean;
} {
  const primary = file.lenders?.find((c) => c.isPrimary && c.status !== "closed");
  const anyActive = file.lenders?.find((c) => c.status !== "closed");
  const lenderName = primary?.lender ?? anyActive?.lender ?? file.lender?.trim() ?? "";
  const contactName = primary?.relationshipManager ?? file.relationshipManager ?? "Assigned Lender Contact";
  return {
    lenderName: lenderName || "Not selected",
    contactName,
    enabled: Boolean(lenderName),
  };
}

export function opportunityNumberForFile(file: LoanFile): string {
  return file.fileNumber?.startsWith("OPP")
    ? file.fileNumber
    : `OPP-${file.fileNumber.replace(/^RC-/, "")}`;
}
