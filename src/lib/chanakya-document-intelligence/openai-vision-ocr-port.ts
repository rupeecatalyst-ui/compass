/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-006 — OpenAI-compatible image vision OCR port.
 * Activates only when DOCUMENT_VISION_API_KEY or OPENAI_API_KEY is present.
 * Does NOT claim scanned-PDF OCR without rasterization.
 * Never returns fabricated text.
 */

import "server-only";

import type { ChanakyaOcrExtractorPort } from "@/types/chanakya-document-intelligence";
import {
  isDocumentVisionConfigured,
  resolveDocumentVisionApiKey,
  resolveDocumentVisionBaseUrl,
  resolveDocumentVisionModel,
} from "./vision-config";

const IMAGE_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

function mimeLooksLikeImage(mimeType: string, displayName?: string): boolean {
  const mime = (mimeType || "").toLowerCase();
  if (IMAGE_MIME.has(mime)) return true;
  return Boolean(displayName && /\.(png|jpe?g|webp|gif)$/i.test(displayName));
}

export function createOpenAiCompatibleVisionOcrPort(): ChanakyaOcrExtractorPort {
  return {
    providerId: "openai_compatible_vision",
    async extract(input) {
      if (!isDocumentVisionConfigured()) return null;

      if (!mimeLooksLikeImage(input.mimeType, input.displayName)) {
        // Scanned PDFs need rasterization or Azure DI — do not pretend.
        return null;
      }

      const apiKey = resolveDocumentVisionApiKey();
      if (!apiKey) return null;

      const mime = (input.mimeType || "image/png").toLowerCase();
      const b64 = Buffer.from(input.bytes).toString("base64");
      const dataUrl = `data:${mime};base64,${b64}`;
      const baseUrl = resolveDocumentVisionBaseUrl().replace(/\/$/, "");
      const model = resolveDocumentVisionModel();

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);
      try {
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            temperature: 0,
            max_tokens: 2500,
            messages: [
              {
                role: "system",
                content:
                  "You are a document OCR assistant for Catalyst One. Transcribe visible text faithfully. Do not invent numbers, names, or tables that are not visible. If unreadable, say UNREADABLE.",
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Extract all readable text from this document image. Preserve line breaks where practical.",
                  },
                  { type: "image_url", image_url: { url: dataUrl } },
                ],
              },
            ],
          }),
        });

        if (!res.ok) {
          return null;
        }
        const json = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const text = json.choices?.[0]?.message?.content?.trim() || "";
        if (!text || /^unreadable$/i.test(text)) return null;
        return {
          text,
          confidence: "medium",
          pageCount: 1,
          method: "vision",
        };
      } catch {
        return null;
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
