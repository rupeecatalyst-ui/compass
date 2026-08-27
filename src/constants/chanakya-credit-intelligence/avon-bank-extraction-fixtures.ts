/**
 * CO-CHANAKYA-023 — Avon-style bank statement fixtures (OPP-2026-000060 patterns).
 */

/** Readable Axis-style statement with labelled balances and narrations. */
export const AVON_BANK_READABLE_FIXTURE = `
Axis Bank Ltd
Account Statement — Current Account
Account Type: Current Account
Statement Period: 01/08/2025 to 30/11/2025
Opening Balance: ₹ 12,45,678.00
Closing Balance: ₹ 15,89,320.50
Total Credits: ₹ 45,00,000.00
Total Debits: ₹ 41,56,357.50
Average Balance: ₹ 14,20,000.00
01/08/2025 NEFT/CR ACME SUPPLIERS CR 5,00,000.00
15/08/2025 EMI/HDFC LOAN DR 45,000.00
20/09/2025 CHQ RET INSUFFICIENT FUNDS DR 25,000.00
`;

/** Second readable period for banking trend observation. */
export const AVON_BANK_READABLE_PRIOR_FIXTURE = `
Axis Bank Ltd
Account Statement — Current Account
Statement Period: 01/04/2025 to 31/07/2025
Opening Balance: ₹ 10,00,000.00
Closing Balance: ₹ 12,45,678.00
Total Credits: ₹ 38,00,000.00
Total Debits: ₹ 35,54,322.00
01/05/2025 NEFT/CR ACME SUPPLIERS CR 4,50,000.00
`;

/** Metadata-only — filename/size only, no readable binary (Avon Axis pattern). */
export const AVON_BANK_METADATA_ONLY_LABEL =
  "Axis Bank Statement Current AC Aug-Nov 2025.pdf";

/** Incomplete statement period — must not infer average balance from open/close. */
export const AVON_BANK_INCOMPLETE_PERIOD_FIXTURE = `
Axis Bank Ltd
Account Statement — Current Account
Partial Statement Period: 01/08/2025 to 15/08/2025
Opening Balance: ₹ 100,000.00
Closing Balance: ₹ 120,000.00
Total Credits: ₹ 50,000.00
Total Debits: ₹ 30,000.00
`;

/** Malformed extract — bank keyword noise without labelled balances. */
export const AVON_BANK_MALFORMED_FIXTURE = `
Axis Bank
corrupted scan fragment
page 1 of 1
??? unreadable ??? 
`;

/** Readable statement without EMI narration — must not invent EMI indicators. */
export const AVON_BANK_NO_EMI_FIXTURE = `
HDFC Bank
Account Statement
Statement Period: 01/01/2025 to 31/03/2025
Opening Balance: ₹ 250,000.00
Closing Balance: ₹ 310,000.00
Total Credits: ₹ 500,000.00
Total Debits: ₹ 440,000.00
01/02/2025 NEFT/CR CLIENT PAYMENT CR 100,000.00
`;

/** Eight Avon metadata-only Axis statements (simulated inventory). */
export const AVON_AXIS_METADATA_ONLY_INVENTORY = [
  "Axis Bank Statement Current AC Apr-Jul 2025.pdf",
  "Axis Bank Statement Current AC Aug-Nov 2025.pdf",
  "Axis Bank Statement OD AC Apr-Jul 2025.pdf",
  "Axis Bank Statement OD AC Aug-Nov 2025.pdf",
  "Axis Bank Statement CC AC Apr-Jul 2025.pdf",
  "Axis Bank Statement CC AC Aug-Nov 2025.pdf",
  "Axis Bank Statement Current AC Dec-Mar 2025.pdf",
  "Axis Bank Statement OD AC Dec-Mar 2025.pdf",
];
