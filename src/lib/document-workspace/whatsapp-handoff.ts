/**
 * CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014D
 * User-initiated WhatsApp handoff. No Business API, no provider credentials,
 * no protected attachments, no delivered/sent/read claims.
 */

import { normalizeLodMobile } from "@/lib/document-requests/resolve-lod-contact";
import {
  DOCUMENT_WORKSPACE_WHATSAPP_FORGED_MOBILE,
  DOCUMENT_WORKSPACE_WHATSAPP_MOBILE_MISSING,
} from "@/constants/document-workspace-inbound";
import {
  formatRequestMessagePlainText,
  messageContainsForbiddenHandoffContent,
  type DocumentWorkspaceRequestMessageDto,
} from "@/lib/document-workspace/request-message-dto";

export type WhatsAppHandoffMobileResult =
  | { ok: true; e164Digits: string; display: string }
  | { ok: false; code: "MISSING_OR_INVALID" | "FORGED_MOBILE"; message: string };

export function normalizeAuthorisedIndianMobile(value: string | null | undefined): string {
  const digits = normalizeLodMobile(value);
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) {
    const rest = digits.slice(1);
    return rest.length === 10 ? `91${rest}` : "";
  }
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 13 && digits.startsWith("091")) return `91${digits.slice(3)}`;
  return digits.length >= 12 && digits.endsWith(digits.slice(-10)) ? digits : "";
}

export function resolveWhatsAppHandoffMobile(input: {
  authorisedContactMobile: string | null | undefined;
  browserSubmittedMobile?: string | null;
}): WhatsAppHandoffMobileResult {
  const authorised = normalizeAuthorisedIndianMobile(input.authorisedContactMobile);
  if (!authorised) {
    return {
      ok: false,
      code: "MISSING_OR_INVALID",
      message: DOCUMENT_WORKSPACE_WHATSAPP_MOBILE_MISSING,
    };
  }
  const submitted = String(input.browserSubmittedMobile || "").trim();
  if (submitted) {
    const normalizedSubmitted = normalizeAuthorisedIndianMobile(submitted);
    if (normalizedSubmitted !== authorised) {
      return {
        ok: false,
        code: "FORGED_MOBILE",
        message: DOCUMENT_WORKSPACE_WHATSAPP_FORGED_MOBILE,
      };
    }
  }
  return { ok: true, e164Digits: authorised, display: `+${authorised}` };
}

export function buildWhatsAppDeepLink(input: { e164Digits: string; text: string }): string {
  const phone = input.e164Digits.replace(/\D/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(input.text)}`;
}

export function preferNativeWebShare(input: {
  canShare: boolean;
  hasShareApi: boolean;
  isMobileLike: boolean;
}): boolean {
  return input.hasShareApi && input.canShare && input.isMobileLike;
}

export function buildWhatsAppHandoffPayload(input: {
  dto: DocumentWorkspaceRequestMessageDto;
  authorisedContactMobile: string | null | undefined;
  browserSubmittedMobile?: string | null;
}):
  | {
      ok: true;
      text: string;
      deepLink: string;
      nativeShare: { title: string; text: string };
      mobileDisplay: string;
    }
  | { ok: false; code: string; message: string } {
  const mobile = resolveWhatsAppHandoffMobile({
    authorisedContactMobile: input.authorisedContactMobile,
    browserSubmittedMobile: input.browserSubmittedMobile,
  });
  if (!mobile.ok) return mobile;
  const text = formatRequestMessagePlainText(input.dto);
  if (messageContainsForbiddenHandoffContent(text)) {
    return { ok: false, code: "FORBIDDEN_CONTENT", message: "Checklist text failed safety checks." };
  }
  return {
    ok: true,
    text,
    deepLink: buildWhatsAppDeepLink({ e164Digits: mobile.e164Digits, text }),
    nativeShare: {
      title: `${input.dto.brand} document request`,
      text,
    },
    mobileDisplay: mobile.display,
  };
}
