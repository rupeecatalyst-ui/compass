/**
 * CO-CHANAKYA-022 — Avon-style GST return fixtures (OPP-2026-000060 patterns).
 */

export const AVON_GSTR3B_JAN_FIXTURE = `
Form GSTR-3B
Year 2025-26
Period January
GSTIN of the supplier 24AACCA5373P1ZD
GSTIN 24AACCA5373P1ZD
(a) Outward taxable supplies (other than zero rated, nil rated and exempted)
5977077.90
Total tax liability 1075874.02
`;

export const AVON_GSTR3B_FEB_FIXTURE = `
Form GSTR-3B
Year 2025-26
Period February
GSTIN of the supplier 24AACCA5373P1ZD
(a) Outward taxable supplies (other than zero rated, nil rated and exempted)
7702714.19
Total tax liability 1386488.55
`;

export const AVON_GSTR3B_MAR_FIXTURE = `
Form GSTR-3B
Year 2025-26
Period March
GSTIN of the supplier 24AACCA5373P1ZD
(a) Outward taxable supplies (other than zero rated, nil rated and exempted)
14459443.63
Total tax liability 2602699.85
`;

/** GSTIN-only document — must not invent turnover. */
export const AVON_GSTIN_ONLY_FIXTURE = `
GST registration certificate
GSTIN of the supplier 24AACCA5373P1ZD
Registered person: Avon Appliances Private Ltd
`;
