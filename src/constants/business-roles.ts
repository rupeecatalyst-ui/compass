/** CRC-016 — Business Role master (Contact-first architecture). */

export const BUSINESS_ROLE_MASTER = [
  "Prospect",
  "Borrower",
  "Investor",
  "Referral Partner",
  "Policyholder",
] as const;

export type BusinessRole = (typeof BUSINESS_ROLE_MASTER)[number];
