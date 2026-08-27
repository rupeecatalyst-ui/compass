/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-014 — Composite OCR port chain.
 * Provider-port based — first successful provider wins.
 */

import type { ChanakyaOcrExtractorPort } from "@/types/chanakya-document-intelligence";

async function defaultOcrProviders(): Promise<ChanakyaOcrExtractorPort[]> {
  const [{ createAzureDocumentIntelligenceOcrPort }, { createOpenAiCompatibleVisionOcrPort }] =
    await Promise.all([
      import("./azure-document-intelligence-ocr-port"),
      import("./openai-vision-ocr-port"),
    ]);
  return [createAzureDocumentIntelligenceOcrPort(), createOpenAiCompatibleVisionOcrPort()];
}

export function createCompositeOcrPort(
  providers?: ChanakyaOcrExtractorPort[],
): ChanakyaOcrExtractorPort {
  return {
    providerId: "composite_ocr_chain",
    async extract(input) {
      const chain = providers ?? (await defaultOcrProviders());
      for (const provider of chain) {
        const result = await provider.extract(input);
        if (result?.text?.trim()) {
          return {
            ...result,
            providerId: result.providerId ?? provider.providerId,
          };
        }
      }
      return null;
    },
  };
}
