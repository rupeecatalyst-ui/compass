/**
 * CO-CHANAKYA-024 — OCR integration readiness fixtures.
 */

/** Minimal valid PDF with empty text layer — triggers ocr_required path. */
export const AVON_OCR_EMPTY_TEXT_LAYER_PDF_BASE64 =
  "JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL01lZGlhQm94WzAgMCA2MTIgNzkyXS9Db250ZW50cyA0IDAgUj4+CmVuZG9iago0IDAgb2JqCjw8L0xlbmd0aCA0Pj4Kc3RyZWFtCiBRCkVUClgKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjw8L1R5cGUiL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDE+PgplbmRvYmoKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgNSAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDE+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMjQ1IDAwMDAwIG4gCjAwMDAwMDAzMDQgMDAwMDAgbiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMTA2IDAwMDAwIG4gCjAwMDAwMDAxODcgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDYvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZjozNzMKJSVFT0Y=";

/** Quality-gated financial OCR text — reuses 012 extractors after OCR. */
export const AVON_OCR_FINANCIAL_SCAN_FIXTURE = `
AVON APPLIANCES PRIVATE LIMITED
Balance Sheet as at 31 March 2024
(Rs in '000)
Particulars Note 31 March 2024 31 March 2023
Total Assets 114,630 109,451
Trade receivables 13 12,450 11,200
Depreciation 3,308 3,474
`.trim();

/** Garbage OCR — must fail quality gate. */
export const AVON_OCR_GARBAGE_FIXTURE =
  "cid cid obj stream xref trailer 123 456 789 page 1";

/** ITR acknowledgement scan — credit-relevant OCR priority. */
export const AVON_OCR_ITR_ACK_FIXTURE = `
INCOME TAX RETURN ACKNOWLEDGEMENT
Assessment Year 2024-25
Name: Avon Appliances Private Ltd
PAN: AACCA5373P
Total Income: Rs. 45,00,000
`.trim();

export function decodeFixturePdfBase64(base64: string): Uint8Array {
  return Uint8Array.from(Buffer.from(base64, "base64"));
}
