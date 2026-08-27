/**
 * CO-CHANAKYA-CREDIT-CERTIFICATION-019F / CO-CHANAKYA-021 —
 * Avon-style financial extraction regression fixtures (OPP-2026-000060 patterns).
 */

/** Note-column table row — note index must not become trade receivables amount. */
export const AVON_BS_NOTE_RECEIVABLES_FIXTURE = `
AVON APPLIANCES PRIVATE LIMITED
Balance Sheet as at 31 March 2024
(Rs in '000)
Particulars Note 31 March 2024 31 March 2023
13 Trade receivables
13 Inventories
Total Assets 114,630 109,451
`;

/** Label on one line, spurious note index on next — must not promote. */
export const AVON_BS_LABEL_THEN_NOTE_FIXTURE = `
Balance Sheet as at 31 March 2024
(Rs in '000)
31 March 2024 31 March 2023
Trade receivables
13
Inventories
13
Total Assets 114,630 109,451
`;

/** Inline note index before real amounts — skip note, keep year amounts. */
export const AVON_BS_INLINE_NOTE_THEN_AMOUNTS_FIXTURE = `
Balance Sheet as at 31 March 2024
(Rs in '000)
Particulars Note 31 March 2024 31 March 2023
Trade receivables 13 12,450 11,200
Inventories 13 8,900 7,500
Total Assets 114,630 109,451
Net Worth 45,200 42,100
Borrowings 28,000 30,500
Cash and cash equivalents 2,150 1,980
Total equity and liabilities 114,630 109,451
`;

/** P&L line items including depreciation, finance cost, PAT. */
export const AVON_PNL_DEPRECIATION_FIXTURE = `
Statement of Profit and loss for the year ended 31 March 2024
(Rs in '000)
Particulars Note 31 March 2024 31 March 2023
Revenue from operations 85,400 79,200
EBITDA 12,100 11,050
Depreciation and Amortization Expenses
3,308
Finance costs 1,450 1,620
Profit before tax 7,200 6,400
Profit for the year 5,100 4,650
Notes forming part of the Financial Statements
DEPRECIATION 3,308 3,474
`;

/** Total assets without unit header — must not promote as high-confidence intelligence. */
export const AVON_BS_NO_UNIT_FIXTURE = `
Balance Sheet as at 31 March 2024
Total Assets 114,630 109,451
`;

/** Combined Avon-style memorandum sample for CO-021 end-to-end quality. */
export const AVON_COMBINED_FINANCIAL_FIXTURE = `
AVON APPLIANCES PRIVATE LIMITED
Balance Sheet as at 31 March 2024
(Rs in '000)
Particulars Note 31 March 2024 31 March 2023
Trade receivables 13 12,450 11,200
Inventories 13 8,900 7,500
Total Assets 114,630 109,451
Statement of Profit and loss for the year ended 31 March 2024
(Rs in '000)
Revenue from operations 85,400 79,200
Depreciation and Amortization Expenses 3,308 3,100
Finance costs 1,450 1,620
Profit for the year 5,100 4,650
`;
