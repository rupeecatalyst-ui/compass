/** Profile code for an additional organisation mailbox. Seeded workflow profiles are unchanged. */
export function mailboxProfileCode(senderEmail: string): string {
  const local = senderEmail.trim().toLowerCase().split("@")[0] ?? "";
  const slug = local.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
  if (!slug) {
    throw Object.assign(new Error("A sender email is required"), { statusCode: 400, code: "SENDER_REQUIRED" });
  }
  return `MAILBOX_${slug}`.slice(0, 48);
}
