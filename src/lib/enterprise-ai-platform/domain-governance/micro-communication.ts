/**
 * Micro Communication Engine (CO-AI-104 DIE).
 * Professional · Warm · Simple · Trustworthy
 * Prefer 1–2 short sentences; ~5–7 words per line.
 */

import { EAI_MICRO_COMMUNICATION_VERSION } from "@/constants/enterprise-ai-platform/domain-governance";
import type { EaiMicroCommunicationResult } from "@/types/enterprise-ai-domain-governance";
import type { EaiLanguageCode } from "@/types/enterprise-ai-multilingual";
import { isEaiOutsideDomainRefusalEquivalent } from "../multilingual/localisation";

const MAX_SENTENCES = 2;
const TARGET_WORDS_PER_LINE = 7;
const MAX_WORDS_PER_LINE = 10;

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function wrapToShortLines(sentence: string): string[] {
  const words = sentence.split(/\s+/).filter(Boolean);
  if (words.length <= MAX_WORDS_PER_LINE) return [words.join(" ")];
  const lines: string[] = [];
  for (let i = 0; i < words.length; i += TARGET_WORDS_PER_LINE) {
    lines.push(words.slice(i, i + TARGET_WORDS_PER_LINE).join(" "));
  }
  return lines;
}

/**
 * Apply enterprise micro-communication rules to audience-facing text.
 * Does not invent content — only shapes existing copy.
 * AI-14: preserves outside-domain refusal in all supported languages.
 */
export function applyEaiMicroCommunication(
  input: string,
  _language: EaiLanguageCode = "en",
): EaiMicroCommunicationResult {
  void _language;
  const notes: string[] = [];
  const raw = (input ?? "").trim();
  if (!raw) {
    return {
      text: "",
      lineCount: 0,
      averageWordsPerLine: 0,
      compliant: true,
      notes: ["Empty text"],
    };
  }

  // Outside-domain fixed sentence must pass through untouched (any language).
  if (isEaiOutsideDomainRefusalEquivalent(raw)) {
    return {
      text: raw,
      lineCount: 1,
      averageWordsPerLine: raw.split(/\s+/).filter(Boolean).length,
      compliant: true,
      notes: ["Outside-domain fixed refusal preserved"],
    };
  }

  let sentences = splitSentences(raw);
  if (sentences.length > MAX_SENTENCES) {
    notes.push(`Truncated from ${sentences.length} sentences to ${MAX_SENTENCES}`);
    sentences = sentences.slice(0, MAX_SENTENCES);
  }

  const lines = sentences.flatMap((s) => wrapToShortLines(s));
  const wordCounts = lines.map((l) => l.split(/\s+/).filter(Boolean).length);
  const averageWordsPerLine =
    wordCounts.length === 0
      ? 0
      : wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;

  const compliant =
    lines.length <= 4 &&
    averageWordsPerLine <= MAX_WORDS_PER_LINE &&
    sentences.length <= MAX_SENTENCES;

  if (!compliant) {
    notes.push("Micro-communication soft ceiling exceeded after shaping");
  }

  return {
    text: lines.join("\n"),
    lineCount: lines.length,
    averageWordsPerLine: Math.round(averageWordsPerLine * 10) / 10,
    compliant,
    notes: [`micro:${EAI_MICRO_COMMUNICATION_VERSION}`, ...notes],
  };
}

export function validateEaiMicroCommunicationCompliance(text: string): string[] {
  const result = applyEaiMicroCommunication(text);
  const errors: string[] = [];
  if (!result.compliant) {
    errors.push(
      `Micro-communication non-compliant (lines=${result.lineCount}, avgWords=${result.averageWordsPerLine})`,
    );
  }
  const paragraphs = text.split(/\n\s*\n/).filter(Boolean);
  if (paragraphs.length > 1) {
    errors.push("Long paragraphs are discouraged — prefer short lines");
  }
  return errors;
}
