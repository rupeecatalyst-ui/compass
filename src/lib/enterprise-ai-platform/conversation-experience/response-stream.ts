/**
 * CO-SARATHI-UX-002 — Presentation streaming when provider streaming is unavailable.
 * Reveals completed facing text progressively so replies don't dump as one template block.
 */

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function chunkFacingText(text: string): string[] {
  const parts = text.match(/\S+\s*|\s+/g);
  if (!parts || parts.length === 0) return [text];
  // Merge into slightly larger chunks for calmer pacing
  const chunks: string[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    chunks.push(parts.slice(i, i + 2).join(""));
  }
  return chunks;
}

/**
 * Stream facing text into `onUpdate`. Honours AbortSignal.
 * Returns the full text when complete.
 */
export async function streamSarathiFacingText(input: {
  text: string;
  chunkMs: number;
  onUpdate: (partial: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  const full = input.text ?? "";
  if (!full.trim()) {
    input.onUpdate(full);
    return full;
  }

  // Very short replies — show promptly (no theatrical stream)
  if (full.length < 48) {
    input.onUpdate(full);
    return full;
  }

  const chunks = chunkFacingText(full);
  let acc = "";
  const jitterBase = input.chunkMs;

  for (const chunk of chunks) {
    if (input.signal?.aborted) {
      input.onUpdate(full);
      return full;
    }
    acc += chunk;
    input.onUpdate(acc);
    const jitter = 0.7 + Math.random() * 0.6;
    await sleep(Math.max(12, Math.round(jitterBase * jitter)));
  }

  input.onUpdate(full);
  return full;
}
