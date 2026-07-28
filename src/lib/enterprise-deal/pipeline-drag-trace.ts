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
  | "blocked"
  | "delete_user_click"
  | "delete_callback_invoked"
  | "delete_initiated"
  | "delete_api_called"
  | "delete_db_confirmed"
  | "delete_registry_refreshed"
  | "delete_pipeline_refreshed"
  | "delete_render_complete"
  | "delete_failed"
  | "delete_blocked";

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
  // CO-QA-002 — always emit delete lifecycle to console for BAT forensics.
  const always =
    step.startsWith("delete_") || step === "error" || step === "blocked";
  if (!always && !enabled()) return;
  const entry = { t: Date.now(), step, payload };
  sequence.push(entry);
  if (sequence.length > 80) sequence.shift();
  console.info(always ? "[CO-QA-002]" : "[CO-PIPELINE-001]", step, payload ?? {});
}

export function getPipelineDragTrace(): typeof sequence {
  return [...sequence];
}

export function clearPipelineDragTrace(): void {
  sequence.length = 0;
}
