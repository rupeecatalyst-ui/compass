/**
 * CO-WP-007 — Client bridge: register generated HTML into Enterprise Document Registry.
 * Links to Contact/Company identity — never a parallel WP document store.
 */

"use client";

import { uploadDocumentToRegistry } from "@/lib/document-registry";
import type { WealthPartnerLegalDocumentRecord } from "@/types/enterprise-wealth-partner-legal-docket";
import type { WealthPartnerIdentityKind } from "@/types/enterprise-wealth-partner-registry";

export async function registerLegalDocumentInEnterpriseRegistry(input: {
  document: WealthPartnerLegalDocumentRecord;
  identityKind: WealthPartnerIdentityKind;
  contactId: string | null;
  companyId: string | null;
  uploadedBy: string;
}): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const blob = new Blob([input.document.contentHtml], { type: "text/html;charset=utf-8" });
  const file = new File(
    [blob],
    `${input.document.documentKind}-v${input.document.versionNumber}.html`,
    { type: "text/html" },
  );
  const links =
    input.identityKind === "contact" && input.contactId
      ? { contactId: input.contactId }
      : input.companyId
        ? { customerId: input.companyId }
        : input.contactId
          ? { contactId: input.contactId }
          : {};
  if (!links.contactId && !links.customerId) return null;

  const uploaded = await uploadDocumentToRegistry({
    file,
    typeRef: input.document.typeRef,
    categoryLabel: "Wealth Partner Legal Docket",
    uploadedBy: input.uploadedBy,
    links,
    uploadSource: "api",
  });
  return uploaded.record.id;
}

export function openLegalDocumentView(input: {
  document: WealthPartnerLegalDocumentRecord;
  getPreviewUrl?: (registryId: string) => Promise<string | null> | string | null;
}): void {
  if (typeof window === "undefined") return;
  void (async () => {
    if (input.document.documentRegistryRecordId && input.getPreviewUrl) {
      try {
        const { getDocumentRegistryRecord } = await import("@/lib/document-registry");
        const record = getDocumentRegistryRecord(input.document.documentRegistryRecordId);
        if (record) {
          const url = await input.getPreviewUrl(input.document.documentRegistryRecordId);
          // Prefer registry blob when available via record-aware callers; fallback below.
          if (url) {
            window.open(url, "_blank", "noopener,noreferrer");
            return;
          }
        }
      } catch {
        /* fall through to HTML content */
      }
    }
    const blob = new Blob([input.document.contentHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  })();
}

export function downloadLegalDocument(doc: WealthPartnerLegalDocumentRecord): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([doc.contentHtml], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${doc.documentKind}-v${doc.versionNumber}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
