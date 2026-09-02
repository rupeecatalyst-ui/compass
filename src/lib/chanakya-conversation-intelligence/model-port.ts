/**
 * CO-C1-CHANAKYA-REALTIME-INTELLIGENCE-001
 * Conversation model port. Deterministic mock injection for tests only.
 * Production uses existing OpenAI-compatible credentials when present — no new Hostinger env required.
 */

import {
  CHANAKYA_CONVERSATION_API_KEY_ENVS,
  CHANAKYA_CONVERSATION_BASE_URL_ENV,
  CHANAKYA_CONVERSATION_DEFAULT_MODEL,
  CHANAKYA_CONVERSATION_MODEL_ENV,
} from "@/constants/chanakya-conversation-intelligence";
import type { ChanakyaConversationModelPort } from "@/types/chanakya-conversation-intelligence";

let overridePort: ChanakyaConversationModelPort | null = null;

export function configureChanakyaConversationModelPort(
  port: ChanakyaConversationModelPort | null,
): void {
  overridePort = port;
}

export function resetChanakyaConversationModelPortForTests(): void {
  overridePort = null;
}

export function resolveChanakyaConversationApiKey(): string | null {
  for (const key of CHANAKYA_CONVERSATION_API_KEY_ENVS) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return null;
}

export function isChanakyaConversationModelConfigured(): boolean {
  return Boolean(overridePort || resolveChanakyaConversationApiKey());
}

function resolveBaseUrl(): string {
  return (
    process.env[CHANAKYA_CONVERSATION_BASE_URL_ENV]?.trim() ||
    process.env.DOCUMENT_VISION_BASE_URL?.trim() ||
    "https://api.openai.com/v1"
  );
}

function resolveModel(): string {
  return (
    process.env[CHANAKYA_CONVERSATION_MODEL_ENV]?.trim() ||
    CHANAKYA_CONVERSATION_DEFAULT_MODEL
  );
}

const livePort: ChanakyaConversationModelPort = {
  async generate(input) {
    const apiKey = resolveChanakyaConversationApiKey();
    if (!apiKey) return null;

    const baseUrl = resolveBaseUrl().replace(/\/$/, "");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const messages: Array<{ role: string; content: string }> = [
        { role: "system", content: input.systemPrompt },
        ...input.history.slice(-8).map((turn) => ({
          role: turn.role === "assistant" ? "assistant" : "user",
          content: turn.text,
        })),
        { role: "user", content: input.userPrompt },
      ];
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: resolveModel(),
          temperature: 0.2,
          max_tokens: 900,
          messages,
        }),
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const json = (await res.json().catch(() => null)) as {
        choices?: Array<{ message?: { content?: string } }>;
      } | null;
      const text = json?.choices?.[0]?.message?.content?.trim() || "";
      return text || null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  },
};

export function getChanakyaConversationModelPort(): ChanakyaConversationModelPort {
  return overridePort ?? livePort;
}
