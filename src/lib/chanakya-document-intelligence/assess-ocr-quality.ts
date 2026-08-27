/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-014 — OCR output quality gate.
 * Garbage OCR must not become content_read or structured financial facts.
 */

import type { ChanakyaDocumentProvenance } from "@/types/chanakya-document-intelligence";
import {
  assessExtractedTextQuality,
  type ExtractedTextQuality,
} from "./assess-text-quality";

export type OcrQualityAssessment = ExtractedTextQuality & {
  /** Downgraded when text fails quality gate. */
  ocrConfidence: ChanakyaDocumentProvenance["confidence"];
  accepted: boolean;
};

export function assessOcrExtractQuality(input: {
  text: string;
  providerConfidence: "high" | "medium" | "low";
}): OcrQualityAssessment {
  const base = assessExtractedTextQuality(input.text);

  if (!base.usable) {
    return {
      ...base,
      ocrConfidence: "none",
      accepted: false,
    };
  }

  let ocrConfidence: ChanakyaDocumentProvenance["confidence"] = "medium";
  if (base.partial) {
    ocrConfidence = input.providerConfidence === "high" ? "medium" : "low";
  } else if (base.hasMeaningfulLabels && input.providerConfidence !== "low") {
    ocrConfidence = input.providerConfidence === "high" ? "high" : "medium";
  } else {
    ocrConfidence = input.providerConfidence;
  }

  return {
    ...base,
    ocrConfidence,
    accepted: true,
  };
}
