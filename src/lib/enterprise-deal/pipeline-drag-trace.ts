/**
 * CO-PIPELINE-001 — Lender Pipeline drag lifecycle tracer.
 * Enable with ?pipelineTrace=1 or localStorage compass:pipeline-drag-trace=1
 * Does not alter business behaviour — observability only.
 */

export type PipelineDragTraceStep =
  | "mouse_down"
  | "drag_start"
  | "drag_over"
  | "drop"
  | "stage_validation"
  | "apply_move"
  | "context_patch"
  | "persist_start"
  | "persist_local"
  | "persist_registry"
  | "context_refresh"
  | "render"
  | "error"
  | "blocked";

type TracePayload = Record<string, unknown>;

function enabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem("compass:pipeline-drag-trace") === "1") return true;
    return new URLSearchParams(window.location.search).get("pipelineTrace") === "1";
  } catch {
    return false;
  }
}

const sequence: Array<{ t: number; step: PipelineDragTraceStep; payload?: TracePayload }> = [];

export function tracePipelineDrag(
  step: PipelineDragTraceStep,
  payload?: TracePayload,
): void {
  if (!enabled()) return;
  const entry = { t: Date.now(), step, payload };
  sequence.push(entry);
  if (sequence.length > 80) sequence.shift();
  // Explicit console — do not suppress (CO-PIPELINE-001).
  console.info("[CO-PIPELINE-001]", step, payload ?? {});
}

export function getPipelineDragTrace(): typeof sequence {
  return [...sequence];
}

export function clearPipelineDragTrace(): void {
  sequence.length = 0;
}
