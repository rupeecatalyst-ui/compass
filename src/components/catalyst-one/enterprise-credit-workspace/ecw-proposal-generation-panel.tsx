"use client";

/**
 * CO-CHANAKYA-CREDIT-PROPOSAL-002 — Progressive MAKE PROPOSAL experience.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Circle, Loader2, Sparkles } from "lucide-react";
import { authenticatedJsonFetch } from "@/lib/api-client";
import {
  CHANAKYA_CREDIT_PROPOSAL_BOUNDARY,
  CHANAKYA_CREDIT_PROPOSAL_SPRINT,
  CHANAKYA_CREDIT_PROPOSAL_STAGES,
  CHANAKYA_CREDIT_PROPOSAL_STREAM_PATH,
} from "@/constants/chanakya-credit-proposal";
import type {
  ChanakyaCreditProposalDraft,
  ChanakyaCreditProposalStageId,
  ChanakyaCreditProposalStageStatus,
  ChanakyaCreditProposalStreamEvent,
  ChanakyaCreditProposalStreamRequest,
} from "@/types/chanakya-credit-proposal";
import { cn } from "@/lib/utils";

type StageState = Record<
  ChanakyaCreditProposalStageId,
  ChanakyaCreditProposalStageStatus
>;

function initialStages(): StageState {
  return Object.fromEntries(
    CHANAKYA_CREDIT_PROPOSAL_STAGES.map((s) => [s.id, "pending" as const]),
  ) as StageState;
}

async function consumeSse(
  response: Response,
  onEvent: (event: ChanakyaCreditProposalStreamEvent) => void,
): Promise<void> {
  if (!response.body) {
    throw new Error("Proposal stream returned an empty body.");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.startsWith("data:"));
      if (!line) continue;
      const json = line.replace(/^data:\s?/, "");
      try {
        onEvent(JSON.parse(json) as ChanakyaCreditProposalStreamEvent);
      } catch {
        // ignore malformed chunk
      }
    }
  }
}

export function EcwProposalGenerationPanel({
  opportunityId,
  stated,
  lenderName,
  documentPresence,
  readinessReady,
  onClose,
}: {
  opportunityId: string;
  stated: ChanakyaCreditProposalStreamRequest["stated"];
  lenderName?: string | null;
  documentPresence?: ChanakyaCreditProposalStreamRequest["documentPresence"];
  readinessReady: boolean;
  onClose: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [stages, setStages] = useState<StageState>(initialStages);
  const [streamText, setStreamText] = useState("");
  const [draft, setDraft] = useState<ChanakyaCreditProposalDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const startedRef = useRef(false);
  const runningRef = useRef(false);

  const start = useCallback(async () => {
    if (!readinessReady || !opportunityId || runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    setDone(false);
    setError(null);
    setDraft(null);
    setStreamText("");
    setStages(initialStages());

    try {
      const res = await authenticatedJsonFetch(CHANAKYA_CREDIT_PROPOSAL_STREAM_PATH, {
        method: "POST",
        body: JSON.stringify({
          opportunityId,
          stated,
          lenderName,
          documentPresence,
        } satisfies ChanakyaCreditProposalStreamRequest),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(body.error?.message || `Stream failed (${res.status})`);
      }

      await consumeSse(res, (event) => {
        if (event.type === "stage") {
          setStages((prev) => ({ ...prev, [event.stageId]: event.status }));
        } else if (event.type === "delta") {
          setStreamText((prev) => prev + event.text);
        } else if (event.type === "draft") {
          setDraft(event.draft);
        } else if (event.type === "done") {
          setDone(true);
        } else if (event.type === "error") {
          setError(event.message);
        }
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to generate proposal.");
    } finally {
      runningRef.current = false;
      setRunning(false);
    }
  }, [documentPresence, lenderName, opportunityId, readinessReady, stated]);

  useEffect(() => {
    if (startedRef.current) return;
    if (!readinessReady || !opportunityId) return;
    startedRef.current = true;
    void start();
  }, [opportunityId, readinessReady, start]);

  const stageRows = useMemo(() => CHANAKYA_CREDIT_PROPOSAL_STAGES, []);

  return (
    <div
      className="flex h-full min-h-0 flex-col border-l border-border/60 bg-background"
      data-sprint={CHANAKYA_CREDIT_PROPOSAL_SPRINT}
      data-read-only="true"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            CHANAKYA Credit Proposal
          </p>
          <p className="text-[11px] text-muted-foreground">
            Read-only draft · never auto-sends
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {!running && (done || error) ? (
            <button
              type="button"
              onClick={() => {
                startedRef.current = false;
                void start();
              }}
              disabled={!readinessReady}
              className="h-7 rounded-md bg-teal-700 px-2.5 text-[11px] font-semibold text-white disabled:opacity-50"
            >
              Regenerate
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="h-7 rounded-md border border-border/70 px-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            Close
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="border-b border-border/50 p-3 lg:border-b-0 lg:border-r">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Progress
          </p>
          <ul className="space-y-2">
            {stageRows.map((stage) => {
              const status = stages[stage.id];
              return (
                <li key={stage.id} className="flex items-start gap-2 text-[11px]">
                  {status === "completed" ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600" aria-hidden />
                  ) : status === "active" ? (
                    <Loader2
                      className="mt-0.5 h-3.5 w-3.5 animate-spin text-teal-700"
                      aria-hidden
                    />
                  ) : (
                    <Circle className="mt-0.5 h-3.5 w-3.5 text-muted-foreground/50" aria-hidden />
                  )}
                  <span
                    className={cn(
                      status === "active" && "font-medium text-foreground",
                      status === "completed" && "text-foreground",
                      status === "pending" && "text-muted-foreground",
                      status === "skipped" && "text-muted-foreground line-through",
                    )}
                  >
                    {stage.label}
                    {status === "skipped" ? " (skipped)" : ""}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">
            Forbidden: {CHANAKYA_CREDIT_PROPOSAL_BOUNDARY.mustNot.slice(0, 4).join(", ")}…
          </p>
        </aside>

        <div className="min-h-0 overflow-y-auto p-3 md:p-4">
          {error ? (
            <p className="rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
              {error}
            </p>
          ) : null}

          {!running && !streamText && !error ? (
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
              <p>
                Click <span className="font-medium text-foreground">Start generation</span> to
                stream a lender-facing draft from authorized Opportunity, document presence, and
                Credit Workbench stated fields.
              </p>
              <p className="mt-2 text-[12px]">
                No FOIR/DSCR/LTV inventing. No document content extraction. No Send to Lender.
              </p>
            </div>
          ) : null}

          {streamText ? (
            <article className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
              {streamText}
              {running ? (
                <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-teal-600 align-middle" />
              ) : null}
            </article>
          ) : null}

          {done && draft ? (
            <p className="mt-4 text-[11px] text-muted-foreground">
              Draft {draft.draftId} · generated {new Date(draft.generatedAt).toLocaleString()} ·
              status draft · auto-send forbidden
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
