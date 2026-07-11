/** Adaptive display duration for general UI reveals. */
export function messageDisplayMs(message: string, phaseId?: string): number {
  const trimmed = message.trim();
  const wordCount = trimmed.split(/\s+/).length;
  const charCount = trimmed.length;

  const fromChars = 680 + Math.max(0, charCount - 28) * 11;
  const fromWords = 700 + Math.max(0, wordCount - 5) * 45;
  let ms = Math.round((fromChars + fromWords) / 2);
  ms = Math.min(1200, Math.max(700, ms));

  if (phaseId === "intelligence") {
    ms = Math.min(1200, ms + 90);
  }

  if (trimmed.endsWith("Ready.") || trimmed.includes("is Ready")) {
    ms = Math.min(1200, ms + 60);
  }

  return ms;
}

const ANALYSIS_BUDGET_MS = 5200;

/** Distribute ~4–6s across all analysis messages proportionally by length. */
export function analysisMessageMs(message: string, allMessages: readonly string[]): number {
  const totalChars = allMessages.reduce((sum, m) => sum + m.length, 0) || 1;
  const share = message.length / totalChars;
  const ms = Math.round(ANALYSIS_BUDGET_MS * share);
  return Math.min(900, Math.max(280, ms));
}

export function phaseTransitionMs(phaseId?: string): number {
  if (phaseId === "intelligence") return 280;
  return 200;
}

export function revealItemDelayMs(label: string, index: number): number {
  if (index === 0) return 500;
  const base = messageDisplayMs(label);
  return Math.min(1100, Math.max(800, base));
}

export function sarathiSpeakDelayMs(message: string): number {
  return messageDisplayMs(message, "customer");
}
