/**
 * CO-C1-DOCUMENT-WORKSPACE-CONTACT-CENTRIC-013
 * Contact 360 / Company 360 href from canonical IDs only.
 */

import { ROUTES } from "@/constants/routes";
import { isCanonicalDocumentWorkspaceId } from "@/lib/document-workspace/context-lock";

export function buildContact360Href(input: {
  contactId?: string | null;
  companyId?: string | null;
}): string | null {
  const companyId = input.companyId?.trim() || "";
  const contactId = input.contactId?.trim() || "";
  if (companyId && isCanonicalDocumentWorkspaceId(companyId) && !contactId) {
    return `${ROUTES.CONTACTS}?company=${encodeURIComponent(companyId)}`;
  }
  if (contactId && isCanonicalDocumentWorkspaceId(contactId)) {
    const params = new URLSearchParams({ contact: contactId });
    if (companyId && isCanonicalDocumentWorkspaceId(companyId)) {
      params.set("company", companyId);
    }
    return `${ROUTES.CONTACTS}?${params.toString()}`;
  }
  if (companyId && isCanonicalDocumentWorkspaceId(companyId)) {
    return `${ROUTES.CONTACTS}?company=${encodeURIComponent(companyId)}`;
  }
  return null;
}

export function displayDocumentWorkspacePartyName(input: {
  companyId?: string | null;
  companyName?: string | null;
  contactName?: string | null;
  fallback?: string | null;
}): string {
  const companyName = input.companyName?.trim() || "";
  const contactName = input.contactName?.trim() || "";
  if (input.companyId?.trim() && companyName) return companyName;
  if (contactName) return contactName;
  if (companyName) return companyName;
  return input.fallback?.trim() || "Not specified";
}
