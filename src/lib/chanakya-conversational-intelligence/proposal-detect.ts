/**
 * CO-C1-CHANAKYA-CONVERSATIONAL-INTELLIGENCE-009
 * Detect Make Proposal requests. Pure — no second proposal engine.
 */

export function isChanakyaMakeProposalRequest(message: string): boolean {
  const q = (message || "").trim().toLowerCase().replace(/\s+/g, " ");
  return (
    /\b(make (a |the )?proposal|draft (a |the )?proposal|generate (a |the )?proposal|prepare (a |the )?proposal|write (a |the )?proposal)\b/.test(
      q,
    ) && !/\bsend (the |this |a )?proposal\b/.test(q)
  );
}
