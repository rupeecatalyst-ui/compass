/** Durable SSOT references only; displayed name/email never authorize delivery. */
export type EmailRecipientRef = { kind: "contact" | "user" | "lender_contact"; id: string };
export type EmailRecipientOption = EmailRecipientRef & { name: string; email: string };
export type EmailRecipientSelections = {
  includePrimaryTo?: boolean;
  toRecipients?: EmailRecipientRef[];
  ccRecipients?: EmailRecipientRef[];
};
export const recipientIdentityKey = (ref: EmailRecipientRef) => `${ref.kind}:${ref.id}`;
