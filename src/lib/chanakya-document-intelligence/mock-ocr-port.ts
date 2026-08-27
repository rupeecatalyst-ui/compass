/**
 * CO-CHANAKYA-CREDIT-CERTIFICATION-019B — Deterministic OCR mock for verification only.
 * Never wired in production default ports. Never returns fabricated financial figures
 * unless the verification fixture explicitly requests labelled sample text.
 */

import type { ChanakyaOcrExtractorPort } from "@/types/chanakya-document-intelligence";

export const DETERMINISTIC_MOCK_OCR_PROVIDER_ID = "deterministic_mock_ocr" as const;

/** Labelled ITR-style fixture — quality-gate safe; used only in verify scripts. */
export const DETERMINISTIC_MOCK_OCR_ITR_TEXT = `
INCOME TAX RETURN ACKNOWLEDGEMENT
Assessment Year 2024-25
Name: Verification Entity Pvt Ltd
PAN: AAAAA0000A
Total Income: Rs. 45,00,000
`.trim();

export function createDeterministicMockOcrPort(options?: {
  /** When true, simulates provider failure (OCR_FAILED path). */
  fail?: boolean;
  /** When true, returns garbage text that must fail the quality gate. */
  rejectQuality?: boolean;
  /** Override fixture text for targeted verify scenarios. */
  text?: string;
}): ChanakyaOcrExtractorPort {
  return {
    providerId: DETERMINISTIC_MOCK_OCR_PROVIDER_ID,
    async extract() {
      if (options?.fail) return null;
      const text = options?.rejectQuality
        ? "cid cid obj stream xref trailer 123 456 789"
        : (options?.text ?? DETERMINISTIC_MOCK_OCR_ITR_TEXT);
      return {
        text,
        confidence: "high" as const,
        pageCount: 2,
        method: "ocr" as const,
        providerId: DETERMINISTIC_MOCK_OCR_PROVIDER_ID,
      };
    },
  };
}

export function isDeterministicMockOcrPort(
  port: ChanakyaOcrExtractorPort | null | undefined,
): boolean {
  return port?.providerId === DETERMINISTIC_MOCK_OCR_PROVIDER_ID;
}
