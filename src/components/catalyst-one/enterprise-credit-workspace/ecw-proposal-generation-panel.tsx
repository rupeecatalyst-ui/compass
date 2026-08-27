"use client";

/**
 * CO-CHANAKYA-028 — Lender proposal document workspace (~70% viewport).
 * Internal intelligence is separated from the lender-facing document canvas.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  Download,
  Eye,
  Loader2,
  Printer,
  SendHorizonal,
  Sparkles,
  X,
} from "lucide-react";
import { authenticatedJsonFetch } from "@/lib/api-client";
import {
  CHANAKYA_CREDIT_PROPOSAL_BOUNDARY,
  CHANAKYA_CREDIT_PROPOSAL_SPRINT,
  CHANAKYA_CREDIT_PROPOSAL_STAGES,
  CHANAKYA_CREDIT_PROPOSAL_STREAM_PATH,
  CHANAKYA_EVIDENCE_VISIBILITY_LABEL,
} from "@/constants/chanakya-credit-proposal";
import type {
  ChanakyaCreditProposalDraft,
  ChanakyaCreditProposalInternalIntelligence,
  ChanakyaCreditProposalStageId,
  ChanakyaCreditProposalStageStatus,
  ChanakyaCreditProposalStreamEvent,
  ChanakyaCreditProposalStreamRequest,
} from "@/types/chanakya-credit-proposal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { EcwProposalDocumentView } from "./ecw-proposal-document-view";
import { sanitizeLenderExportMarkdown } from "@/lib/chanakya-credit-proposal/lender-proposal-export";
import "@/styles/ecw-proposal-workspace.css";

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

function downloadProposalMarkdown(draft: ChanakyaCreditProposalDraft, borrowerName: string) {
  const slug = (draft.opportunityNumber || draft.opportunityId).replace(/[^\w-]+/g, "_");
  // Lender-facing draft only — internal intelligence is never included in download.
  const lenderBody = sanitizeLenderExportMarkdown(draft.fullText.trim());
  const blob = new Blob([lenderBody], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `Credit-Proposal-${slug}-${borrowerName.replace(/\s+/g, "-")}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function EcwProposalGenerationPanel({
  opportunityId,
  opportunityNumber,
  borrowerName,
  stated,
  rmNote,
  lenderName,
  lenderContactName,
  lenderSendEnabled,
  documentPresence,
  canGenerate,
  onClose,
  onSent,
}: {
  opportunityId: string;
  opportunityNumber?: string | null;
  borrowerName?: string | null;
  stated: ChanakyaCreditProposalStreamRequest["stated"];
  rmNote?: string | null;
  lenderName?: string | null;
  lenderContactName?: string | null;
  lenderSendEnabled?: boolean;
  documentPresence?: ChanakyaCreditProposalStreamRequest["documentPresence"];
  canGenerate: boolean;
  onClose: () => void;
  onSent?: (message: string) => void;
}) {
  const [running, setRunning] = useState(false);
  const [stages, setStages] = useState<StageState>(initialStages);
  const [streamText, setStreamText] = useState("");
  const [draft, setDraft] = useState<ChanakyaCreditProposalDraft | null>(null);
  const [intelligence, setIntelligence] =
    useState<ChanakyaCreditProposalInternalIntelligence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [workspaceToast, setWorkspaceToast] = useState<string | null>(null);
  const startedRef = useRef(false);
  const runningRef = useRef(false);
  const documentRef = useRef<HTMLDivElement>(null);

  const displayBorrower = borrowerName?.trim() || "Borrower";
  const displayLender = lenderName?.trim() || "Not selected";
  const displayRecipient = lenderContactName?.trim() || "—";
  const sendSubject = useMemo(() => {
    const ref = opportunityNumber || opportunityId;
    return `Credit Proposal — ${displayBorrower} — ${ref}`;
  }, [displayBorrower, opportunityId, opportunityNumber]);

  const start = useCallback(async () => {
    if (!canGenerate || !opportunityId || runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    setDone(false);
    setError(null);
    setDraft(null);
    setIntelligence(null);
    setStreamText("");
    setStages(initialStages());

    try {
      const res = await authenticatedJsonFetch(CHANAKYA_CREDIT_PROPOSAL_STREAM_PATH, {
        method: "POST",
        body: JSON.stringify({
          opportunityId,
          rmNote: rmNote?.trim() || null,
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
        } else if (event.type === "intelligence") {
          setIntelligence(event.intelligence);
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
  }, [canGenerate, documentPresence, lenderName, opportunityId, rmNote, stated]);

  useEffect(() => {
    if (startedRef.current) return;
    if (!canGenerate || !opportunityId) return;
    startedRef.current = true;
    void start();
  }, [canGenerate, opportunityId, start]);

  const stageRows = useMemo(() => CHANAKYA_CREDIT_PROPOSAL_STAGES, []);
  const readiness = intelligence?.readiness;
  const canSend = Boolean(draft && lenderSendEnabled && !running);
  const canDownload = Boolean(draft?.fullText);
  const activeStage = stageRows.find((s) => stages[s.id] === "active");

  const handlePrintPdf = () => {
    document.body.classList.add("ecw-proposal-print-active");
    const cleanup = () => {
      document.body.classList.remove("ecw-proposal-print-active");
    };
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 2_000);
  };

  return (
    <div
      className="flex h-full min-h-[min(78vh,860px)] min-w-0 flex-col overflow-x-hidden bg-muted/10 lg:min-h-[min(82vh,920px)]"
      data-sprint={CHANAKYA_CREDIT_PROPOSAL_SPRINT}
      data-proposal-sprint="CO-CHANAKYA-028"
      data-workspace="proposal"
      data-proposal-viewport-share="70"
      data-read-only="true"
    >
      {/* Proposal workspace action bar — all proposal actions live here */}
      <div
        className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-border/60 bg-background/95 px-3 py-2 backdrop-blur-sm sm:px-4 print:hidden"
        data-proposal-action-bar="true"
      >
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Proposal Workspace
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {opportunityNumber || opportunityId} · {displayBorrower}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={!canSend}
            onClick={() => setSendOpen(true)}
          >
            <SendHorizonal className="h-3.5 w-3.5" />
            Send to Lender
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 gap-1.5 text-xs"
            disabled={!canDownload}
            onClick={() => draft && downloadProposalMarkdown(draft, displayBorrower)}
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 gap-1.5 text-xs"
            disabled={!canDownload}
            onClick={handlePrintPdf}
          >
            <Printer className="h-3.5 w-3.5" />
            Print / PDF
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            disabled={!draft && !streamText}
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Button>
          {!running && (done || error) ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              disabled={!canGenerate}
              onClick={() => {
                startedRef.current = false;
                void start();
              }}
            >
              Regenerate
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 gap-1 text-xs text-muted-foreground"
            onClick={() => setInternalOpen((v) => !v)}
          >
            Internal review
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform", internalOpen && "rotate-180")}
            />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1 text-xs"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
            Close
          </Button>
        </div>
      </div>

      {workspaceToast ? (
        <div
          className="border-b border-teal-500/25 bg-teal-500/10 px-4 py-1.5 text-[11px] text-teal-950 dark:text-teal-100 print:hidden"
          data-proposal-workspace-toast="true"
        >
          {workspaceToast}
        </div>
      ) : null}

      {running && activeStage ? (
        <div className="flex items-center gap-2 border-b border-border/40 bg-teal-500/5 px-4 py-1.5 text-[11px] text-muted-foreground print:hidden">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-700" />
          <span>{activeStage.label}…</span>
        </div>
      ) : null}

      {error ? (
        <div className="border-b border-rose-500/30 bg-rose-500/5 px-4 py-2 text-sm text-rose-700 dark:text-rose-300 print:hidden">
          {error}
        </div>
      ) : null}

      {/* Document canvas — lender-facing only */}
      <div
        ref={documentRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-muted/20 to-background px-2 py-4 sm:px-4 sm:py-6 lg:px-6 print:overflow-visible print:bg-white print:p-0"
        data-proposal-document-canvas="true"
      >
        <EcwProposalDocumentView
          draft={draft}
          streamText={streamText}
          streaming={running}
          borrowerName={displayBorrower}
        />
      </div>

      {/* Internal intelligence — never part of lender document / print */}
      {internalOpen && intelligence ? (
        <div
          className="max-h-[34vh] shrink-0 overflow-y-auto border-t border-amber-500/20 bg-amber-500/5 px-4 py-3 print:hidden"
          data-print-exclude="true"
          data-proposal-internal-only="true"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
            Internal review only — not included in lender proposal
          </p>

          <div className="mt-2 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {readiness ? (
              <div className="rounded-md border border-border/60 bg-background/80 p-2">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Proposal Readiness
                </p>
                <p className="text-sm font-semibold">
                  {CHANAKYA_EVIDENCE_VISIBILITY_LABEL[readiness.overall]}
                </p>
                <p className="text-[10px] text-muted-foreground">{readiness.summary}</p>
              </div>
            ) : null}

            {intelligence.documentReading ? (
              <div className="rounded-md border border-border/60 bg-background/80 p-2">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Document reading
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Reviewed {intelligence.documentReading.documentsReviewed} · readable{" "}
                  {intelligence.documentReading.documentsWithReadableText} · OCR required{" "}
                  {intelligence.documentReading.documentsRequiringOcr} · facts{" "}
                  {intelligence.documentReading.structuredFactsCount}
                </p>
              </div>
            ) : null}

            {intelligence.recommendations?.length ? (
              <div className="rounded-md border border-border/60 bg-background/80 p-2 md:col-span-2 xl:col-span-1">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Strengthen assessment
                </p>
                <ul className="mt-1 space-y-1">
                  {intelligence.recommendations.slice(0, 3).map((r) => (
                    <li key={r.id} className="text-[10px] leading-snug text-muted-foreground">
                      <span className="font-medium text-foreground">{r.title}</span> — {r.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <details className="mt-2">
            <summary className="cursor-pointer text-[10px] text-muted-foreground">
              Generation progress
            </summary>
            <ul className="mt-2 grid gap-1 sm:grid-cols-2">
              {stageRows.map((stage) => {
                const status = stages[stage.id];
                return (
                  <li key={stage.id} className="flex items-center gap-2 text-[10px]">
                    {status === "completed" ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    ) : status === "active" ? (
                      <Loader2 className="h-3 w-3 animate-spin text-teal-700" />
                    ) : (
                      <Circle className="h-3 w-3 text-muted-foreground/40" />
                    )}
                    {stage.label}
                  </li>
                );
              })}
            </ul>
          </details>

          <p className="mt-2 text-[9px] text-muted-foreground">
            Forbidden: {CHANAKYA_CREDIT_PROPOSAL_BOUNDARY.mustNot.slice(0, 3).join(", ")}…
          </p>
        </div>
      ) : null}

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent
          className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl print:hidden"
          data-print-exclude="true"
        >
          <DialogHeader className="border-b border-border/60 px-4 py-3">
            <DialogTitle className="text-base">Proposal preview</DialogTitle>
            <DialogDescription className="text-xs">
              Lender-facing content only — internal recommendations are excluded.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 p-4">
            <EcwProposalDocumentView
              draft={draft}
              streamText={streamText}
              streaming={running}
              borrowerName={displayBorrower}
            />
          </div>
          <DialogFooter className="border-t border-border/60 px-4 py-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>
              Close preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send to Lender — explicit human confirmation */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="sm:max-w-md print:hidden" data-print-exclude="true">
          <DialogHeader>
            <DialogTitle className="text-sm">Send proposal to lender</DialogTitle>
            <DialogDescription className="text-xs">
              CHANAKYA never auto-sends. Confirm recipient and attachment before dispatch.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3 text-xs">
            <SendRow label="Lender" value={displayLender} />
            <SendRow label="Recipient" value={displayRecipient} />
            <SendRow label="Subject" value={sendSubject} />
            <SendRow
              label="Attachment"
              value={
                draft
                  ? `Credit proposal draft (${draft.draftId}) · ${draft.sections.length} section(s)`
                  : "No draft available"
              }
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" size="sm" onClick={() => setSendOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!canSend}
              onClick={() => {
                setSendOpen(false);
                const message = `Credit proposal queued for ${displayRecipient} at ${displayLender}. CHANAKYA did not auto-send without your confirmation.`;
                setWorkspaceToast(message);
                window.setTimeout(() => setWorkspaceToast(null), 3200);
                onSent?.(message);
              }}
            >
              Confirm send to lender
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SendRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground sm:max-w-[65%] sm:text-right">{value}</span>
    </div>
  );
}
