/**
 * Public COMPASS WhatsApp link helper.
 * Builds a digits-only `https://wa.me/{country}{national}` href.
 * Never appends a pre-written WhatsApp message query.
 */
export const PUBLIC_WHATSAPP_LINK_REL = "noopener noreferrer" as const;
export const PUBLIC_WHATSAPP_LINK_TARGET = "_blank" as const;

export function buildPublicWhatsAppHref(countryCode: string, nationalNumber: string): string {
  const cc = String(countryCode).replace(/\D/g, "");
  const national = String(nationalNumber).replace(/\D/g, "");
  if (cc !== "91" || national.length !== 10) {
    throw new Error("Public WhatsApp href requires country code 91 and a 10-digit national number.");
  }
  return `https://wa.me/${cc}${national}`;
}
