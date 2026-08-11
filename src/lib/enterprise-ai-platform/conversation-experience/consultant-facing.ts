/**
 * CO-SARATHI-VISION-001 WAVE-1 — Consultant-style facing (experience layer).
 * Retires interview/questionnaire reply patterns. Engines unchanged.
 */

import { applyEaiMicroCommunication } from "../domain-governance/micro-communication";
import type { EaiLanguageCode } from "@/types/enterprise-ai-multilingual";
import {
  isBlockedFacingPhrase,
  normaliseFacingLine,
  pickSarathiAcknowledgement,
  pickSarathiToneLibraryOpener,
  type SarathiProductContextId,
} from "./ux-flow";

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function stripBlockedAndDuplicates(
  sentences: string[],
  priorAssistantTexts: string[],
): string[] {
  const priorNorm = priorAssistantTexts.map(normaliseFacingLine);
  const out: string[] = [];
  const seen = new Set<string>();

  for (const s of sentences) {
    if (isBlockedFacingPhrase(s)) continue;
    const n = normaliseFacingLine(s);
    if (!n || seen.has(n)) continue;
    if (priorNorm.some((p) => p.includes(n) || n.includes(p.slice(0, Math.min(40, p.length))))) {
      continue;
    }
    seen.add(n);
    out.push(s);
  }
  return out;
}

function endsWithQuestion(text: string): boolean {
  return /[?؟।]\s*$/.test(text.trim());
}

function softWeaveClarifier(ack: string, question: string): string {
  const q = question.trim().replace(/^[A-Z]/, (c) => c.toLowerCase());
  // Consultant weave — not "Ack. Form question."
  const patterns = [
    `${ack}. ${question}`,
    `${ack} — ${q}`,
    `${ack}. If you're comfortable sharing, ${q}`,
  ];
  const idx =
    (ack.length + question.length) % patterns.length;
  return patterns[idx]!;
}

/**
 * Natural consultation reply.
 * May educate, acknowledge, or softly clarify — never a fixed questionnaire turn.
 */
export function shapeSarathiConsultantFacing(input: {
  seedText: string;
  plannerQuestion?: string | null;
  priorAssistantTexts: string[];
  product: SarathiProductContextId;
  advising?: boolean;
  language?: EaiLanguageCode;
  /** When true, prefer reflecting understanding over asking */
  preferReflect?: boolean;
}): string {
  const language = input.language ?? "en";
  const plannerQ = input.plannerQuestion?.trim() || null;
  const cleaned = stripBlockedAndDuplicates(
    splitSentences(input.seedText),
    input.priorAssistantTexts,
  );

  if (input.advising) {
    const body =
      cleaned.slice(0, 2).join(" ") ||
      "Based on what you've shared, here are sensible next steps to review.";
    return applyEaiMicroCommunication(body, language).text;
  }

  // Prefer substantive seed when it already carries a natural question or reflection
  if (cleaned.length > 0 && (endsWithQuestion(cleaned.join(" ")) || input.preferReflect)) {
    return applyEaiMicroCommunication(cleaned.slice(0, 2).join(" "), language).text;
  }

  if (cleaned.length > 0 && !plannerQ) {
    return applyEaiMicroCommunication(cleaned.slice(0, 2).join(" "), language).text;
  }

  if (plannerQ) {
    // Alternate: sometimes acknowledge only (consultant doesn't always interrogate)
    const priorAsked = input.priorAssistantTexts.filter((t) => endsWithQuestion(t)).length;
    if (priorAsked >= 2 && priorAsked % 3 === 2) {
      const tone =
        pickSarathiToneLibraryOpener(input.product, input.priorAssistantTexts) ??
        pickSarathiAcknowledgement(input.priorAssistantTexts);
      const reflect =
        cleaned[0] ??
        `${tone.replace(/\.+$/, "")}. Whenever you're ready, continue.`;
      return applyEaiMicroCommunication(reflect, language).text;
    }

    const tone = pickSarathiToneLibraryOpener(input.product, input.priorAssistantTexts);
    const ack = (tone ?? pickSarathiAcknowledgement(input.priorAssistantTexts)).replace(
      /\.+$/,
      "",
    );
    const draft = softWeaveClarifier(ack, plannerQ);
    return applyEaiMicroCommunication(draft, language).text;
  }

  const body =
    cleaned.slice(0, 2).join(" ") ||
    (input.product === "general"
      ? "I'm here when you're ready. Tell me what you're hoping to arrange."
      : "Thank you — I'm with you. Tell me what would help most next.");
  return applyEaiMicroCommunication(body, language).text;
}
