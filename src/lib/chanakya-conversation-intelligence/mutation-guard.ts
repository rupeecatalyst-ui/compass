/**
 * CO-C1-CHANAKYA-REALTIME-INTELLIGENCE-001
 * CHANAKYA is strictly read-only — detect mutation requests before generation.
 */

export function isChanakyaMutationRequest(message: string): boolean {
  const q = (message || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!q) return false;
  return (
    /\b(create|delete|remove|archive|assign|reassign|upload|replace document|send (an? )?(email|whatsapp|sms|message)|email the customer|move (this |the )?stage|change stage|mark as|update invoice|post (an? )?payment|change campaign|approve this|reject this|disburse now|close this deal|edit the deal|save changes)\b/.test(
      q,
    ) ||
    /\b(please )?(make|do) (the )?(assignment|upload|payment|stage change)\b/.test(q)
  );
}
