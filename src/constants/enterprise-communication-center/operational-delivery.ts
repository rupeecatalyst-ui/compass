/**
 * CO-C1-OPERATIONAL-EMAIL-002 — Controlled operational SMTP delivery gate.
 * Separate from ENCE_EXTERNAL_DELIVERY_ENABLED (broad platform simulation).
 *
 * Hostinger env: ECC_OPERATIONAL_SMTP_DELIVERY_ENABLED=true
 * Enables server-side CUSTOMERS SMTP for approved operational events only.
 */

export function isOperationalSmtpDeliveryEnabled(): boolean {
  const raw = process.env.ECC_OPERATIONAL_SMTP_DELIVERY_ENABLED?.trim().toLowerCase();
  return raw === "true" || raw === "1";
}
