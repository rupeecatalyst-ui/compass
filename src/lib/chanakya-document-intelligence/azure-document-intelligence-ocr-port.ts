/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-014 — Azure Document Intelligence OCR port.
 * Supports scanned PDFs and images when endpoint + key are configured.
 * Never returns fabricated text.
 */

import "server-only";

import { CHANAKYA_AZURE_DI_API_VERSION } from "@/constants/chanakya-document-intelligence";
import type { ChanakyaOcrExtractorPort } from "@/types/chanakya-document-intelligence";
import {
  isAzureDocumentIntelligenceConfigured,
  resolveAzureDocumentIntelligenceEndpoint,
  resolveAzureDocumentIntelligenceKey,
} from "./ocr-provider-config";

const PDF_MIME = "application/pdf";

function mimeLooksLikePdf(mimeType: string, displayName?: string): boolean {
  const mime = (mimeType || "").toLowerCase();
  if (mime === PDF_MIME) return true;
  return Boolean(displayName && /\.pdf$/i.test(displayName));
}

function mimeLooksLikeImage(mimeType: string, displayName?: string): boolean {
  const mime = (mimeType || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  return Boolean(displayName && /\.(png|jpe?g|webp|gif|tif{1,2}|bmp)$/i.test(displayName));
}

async function pollAzureAnalyzeResult(input: {
  operationLocation: string;
  apiKey: string;
}): Promise<{ text: string; pageCount: number } | null> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const res = await fetch(input.operationLocation, {
      headers: { "Ocp-Apim-Subscription-Key": input.apiKey },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      status?: string;
      analyzeResult?: {
        content?: string;
        pages?: unknown[];
      };
    };
    if (json.status === "failed") return null;
    if (json.status === "succeeded") {
      const text = json.analyzeResult?.content?.trim() || "";
      const pageCount = json.analyzeResult?.pages?.length ?? 0;
      if (!text) return null;
      return { text, pageCount: pageCount || 1 };
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}

export function createAzureDocumentIntelligenceOcrPort(): ChanakyaOcrExtractorPort {
  return {
    providerId: "azure_document_intelligence",
    async extract(input) {
      if (!isAzureDocumentIntelligenceConfigured()) return null;

      const isPdf = mimeLooksLikePdf(input.mimeType, input.displayName);
      const isImage = mimeLooksLikeImage(input.mimeType, input.displayName);
      if (!isPdf && !isImage) return null;

      const endpoint = resolveAzureDocumentIntelligenceEndpoint()!.replace(/\/$/, "");
      const apiKey = resolveAzureDocumentIntelligenceKey()!;
      const model = "prebuilt-read";
      const analyzeUrl = `${endpoint}/documentintelligence/documentModels/${model}:analyze?api-version=${CHANAKYA_AZURE_DI_API_VERSION}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);
      try {
        const res = await fetch(analyzeUrl, {
          method: "POST",
          headers: {
            "Ocp-Apim-Subscription-Key": apiKey,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            base64Source: Buffer.from(input.bytes).toString("base64"),
          }),
        });
        if (!res.ok) return null;

        const operationLocation = res.headers.get("operation-location");
        if (!operationLocation) return null;

        const polled = await pollAzureAnalyzeResult({ operationLocation, apiKey });
        if (!polled) return null;

        return {
          text: polled.text,
          confidence: "high",
          pageCount: polled.pageCount,
          method: "ocr",
          providerId: "azure_document_intelligence",
        };
      } catch {
        return null;
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
