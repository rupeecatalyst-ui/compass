/** UX-01A / UX-01C — Seeded Chanakya insight messages (UI foundation; no AI). */

export const CHANAKYA_INSIGHT_MESSAGES = [
  "Excellent relationship management helped maintain customer engagement.",
  "Consistent follow-ups reduced turnaround time.",
  "Well-managed documentation minimized lender queries.",
  "Excellent work. Strong customer engagement helped maintain momentum throughout the loan journey.",
  "Your disciplined follow-ups reduced turnaround time and contributed to a smooth approval.",
  "Proactive communication with the lender kept the file moving without unnecessary stalls.",
] as const;

export const CHANAKYA_PERFORMANCE_BADGE_PLACEHOLDERS = [
  "Customer Engagement",
  "Approval Speed",
  "Documentation Quality",
  "Negotiation Quality",
  "Relationship Excellence",
] as const;

/** Deterministic rotation per loan file — changes daily, not a single static message. */
export function pickChanakyaInsight(seed: string): string {
  const dayIndex = new Date().getDate();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash + seed.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash + dayIndex) % CHANAKYA_INSIGHT_MESSAGES.length;
  return CHANAKYA_INSIGHT_MESSAGES[index]!;
}
