"use client";

/**
 * CO-CHANAKYA-PHASE1-INAPP-CONVERSATION-CLOSURE-037
 * CO-C1-CHANAKYA-CONVERSATIONAL-INTELLIGENCE-009
 * Conversational Ask CHANAKYA — multi-turn bubbles, real stream, read-only.
 */

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  ArrowDown,
  Menu,
  Copy,
  Download,
  Mic,
  MicOff,
  RefreshCw,
  Send,
  Square,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CHANAKYA_INAPP_CONVERSATION_PROMPTS } from "@/constants/chanakya-inapp-conversation";
import {
  CHANAKYA_AUTH_REQUIRED_MESSAGE,
  CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE,
} from "@/constants/chanakya-conversation-intelligence";
import {
  CHANAKYA_PHASE1_READ_ONLY_INDICATOR,
  CHANAKYA_PHASE1_SELECT_TRANSACTION_MESSAGE,
  CHANAKYA_SUGGESTED_QUESTIONS,
} from "@/constants/chanakya-conversational-intelligence";
import {
  postChanakyaInappConversationTurn,
  postChanakyaMessageFeedback,
  streamChanakyaInappConversationTurn,
} from "@/lib/chanakya-inapp-conversation/client";
import { getActiveOpportunityContext } from "@/lib/lead-opportunity-journey/active-context";
import {
  isBrowserSpeechRecognitionAvailable,
  startLiveBrowserStt,
} from "@/lib/enterprise-conversation-intelligence";
import { buildCanonicalJourneyStageHref } from "@/constants/canonical-journey-header";
import type { ChanakyaConversationPrompt } from "@/types/chanakya-dashboard-intelligence";
import type { ChanakyaInappMessage } from "@/types/chanakya-inapp-conversation";
import type { ChanakyaCreditProposalDraft } from "@/types/chanakya-credit-proposal";
import { CHANAKYA_CHAT_JUMP_TO_LATEST_LABEL, CHANAKYA_CHAT_NEAR_BOTTOM_PX } from "@/constants/chanakya-chat-ux";
import { isChanakyaChatNearBottom } from "@/lib/chanakya-chat-ux/auto-scroll";
import { cn } from "@/lib/utils";
import { ChanakyaSafeMarkdown } from "@/components/catalyst-one/user-home-dashboard/chanakya-safe-markdown";
import { ChanakyaProposalResponse } from "@/components/catalyst-one/user-home-dashboard/chanakya-proposal-response";

type Props = {
  prompts?: ChanakyaConversationPrompt[];
  className?: string;
  sessionId?: string | null;
  messages?: ChanakyaInappMessage[];
  onSessionChange?: (sessionId: string | null) => void;
  onMessagesChange?: (messages: ChanakyaInappMessage[]) => void;
  queuedPrompt?: string | null;
  onQueuedPromptConsumed?: () => void;
  sessionTitle?: string;
  retentionNotice?: string;
  onOpenRail?: () => void;
};

function formatClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
}

/** Canonical Opportunity/Deal IDs only — never proposal body or PII in the query string. */
function proposalWorkspaceHref(
  opportunityId: string | null | undefined,
  dealId: string | null | undefined,
): string | null {
  const opp = opportunityId?.trim() || null;
  const deal = dealId?.trim() || null;
  if (!opp && !deal) return null;
  return buildCanonicalJourneyStageHref("credit_bench", {
    opportunityId: opp,
    dealId: deal,
    fileId: deal,
  });
}

export function ChanakyaInappConversationPanel({
  prompts = CHANAKYA_INAPP_CONVERSATION_PROMPTS,
  className,
  sessionId: sessionIdProp,
  messages: messagesProp,
  onSessionChange,
  onMessagesChange,
  queuedPrompt,
  onQueuedPromptConsumed,
  sessionTitle = "Conversation",
  retentionNotice,
  onOpenRail,
}: Props) {
  const listId = useId();
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sttRef = useRef<ReturnType<typeof startLiveBrowserStt> | null>(null);
  const [draft, setDraft] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(sessionIdProp ?? null);
  const [messages, setMessages] = useState<ChanakyaInappMessage[]>(messagesProp ?? []);
  const [loading, setLoading] = useState(false);
  const [awaitingFirstToken, setAwaitingFirstToken] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [showJump, setShowJump] = useState(false);
  const [followLatest, setFollowLatest] = useState(true);
  const [proposalDraft, setProposalDraft] = useState<ChanakyaCreditProposalDraft | null>(null);
  const [authorisedDealId, setAuthorisedDealId] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");

  useEffect(() => {
    if (sessionIdProp !== undefined) setSessionId(sessionIdProp);
  }, [sessionIdProp]);

  useEffect(() => {
    if (messagesProp) setMessages(messagesProp);
  }, [messagesProp]);

  const jumpToLatest = useCallback(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setShowJump(false);
    setFollowLatest(true);
  }, []);

  useEffect(() => {
    if (!followLatest) return;
    const el = messagesScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, streamingText, awaitingFirstToken, followLatest]);

  const resolveEntity = useCallback(() => {
    const active = getActiveOpportunityContext();
    const opportunityId = active?.opportunityId?.trim() || null;
    const fileId = active?.fileId?.trim() || null;
    const dealId = fileId && fileId !== opportunityId ? fileId : authorisedDealId;
    return {
      opportunityId,
      dealId,
      customer: active?.customer?.trim() || null,
      opportunityReference: active?.opportunityReference?.trim() || null,
      product: active?.product?.trim() || null,
    };
  }, [authorisedDealId]);

  const stopGenerating = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setAwaitingFirstToken(false);
  }, []);

  const sendMessage = useCallback(
    async (raw: string) => {
      const message = raw.trim();
      if (!message || loading) return;

      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;

      setLoading(true);
      setAwaitingFirstToken(true);
      setStreamingText("");
      setError(null);
      setLastFailedMessage(null);
      setDraft("");

      const optimistic: ChanakyaInappMessage = {
        id: `local_user_${Date.now()}`,
        role: "user",
        text: message,
        createdAt: new Date().toISOString(),
        provenance: [],
        availabilityNotes: [],
      };
      setMessages((prev) => [...prev, optimistic]);

      try {
        const entity = resolveEntity();
        await streamChanakyaInappConversationTurn(
          {
            sessionId,
            message,
            opportunityId: entity.opportunityId,
            dealId: entity.dealId,
          },
          {
            signal: abort.signal,
            onSession: (id) => {
              setSessionId(id);
              onSessionChange?.(id);
            },
            onDelta: (text) => {
              setAwaitingFirstToken(false);
              setStreamingText((prev) => prev + text);
            },
            onProposal: (event) => {
              setProposalDraft(event.draft);
            },
            onDone: (result) => {
              setSessionId(result.sessionId);
              onSessionChange?.(result.sessionId);
              setMessages(result.messages);
              onMessagesChange?.(result.messages);
              setAuthorisedDealId(result.activeEntity.dealId?.trim() || null);
              setStreamingText("");
            },
          },
        );
      } catch {
        if (abort.signal.aborted) {
          setStreamingText((current) => {
            if (current.trim()) {
              const partial: ChanakyaInappMessage = {
                id: `local_assistant_${Date.now()}`,
                role: "assistant",
                text: current,
                createdAt: new Date().toISOString(),
                provenance: [],
                availabilityNotes: [],
              };
              setMessages((prev) => [...prev, partial]);
            }
            return "";
          });
        } else {
          try {
            const entity = resolveEntity();
            const result = await postChanakyaInappConversationTurn({
              sessionId,
              message,
              opportunityId: entity.opportunityId,
              dealId: entity.dealId,
            });
            setSessionId(result.sessionId);
            onSessionChange?.(result.sessionId);
            setMessages(result.messages);
            onMessagesChange?.(result.messages);
            setAuthorisedDealId(result.activeEntity.dealId?.trim() || null);
          } catch (fallbackErr) {
            setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
            setDraft(message);
            setLastFailedMessage(message);
            setError(
              fallbackErr &&
                typeof fallbackErr === "object" &&
                "statusCode" in fallbackErr &&
                Number((fallbackErr as { statusCode?: number }).statusCode) === 401
                ? CHANAKYA_AUTH_REQUIRED_MESSAGE
                : fallbackErr &&
                    typeof fallbackErr === "object" &&
                    "statusCode" in fallbackErr &&
                    Number((fallbackErr as { statusCode?: number }).statusCode) === 403
                  ? "You do not have access to ask CHANAKYA for that view."
                  : CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE,
            );
          }
        }
      } finally {
        setLoading(false);
        setAwaitingFirstToken(false);
        if (abortRef.current === abort) abortRef.current = null;
      }
    },
    [loading, onMessagesChange, onSessionChange, resolveEntity, sessionId],
  );

  useEffect(() => {
    const q = queuedPrompt?.trim();
    if (!q) return;
    onQueuedPromptConsumed?.();
    void sendMessage(q);
  }, [queuedPrompt, onQueuedPromptConsumed, sendMessage]);

  const onSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      void sendMessage(draft);
    },
    [draft, sendMessage],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (!loading) void sendMessage(draft);
      }
    },
    [draft, loading, sendMessage],
  );

  const toggleMic = useCallback(() => {
    if (loading) return;
    if (listening) {
      const live = sttRef.current?.getTranscript() ?? "";
      sttRef.current?.stop();
      sttRef.current = null;
      setListening(false);
      if (live.trim()) setDraft(live.trim());
      return;
    }
    if (!isBrowserSpeechRecognitionAvailable()) return;
    const stt = startLiveBrowserStt({
      lang: "en-IN",
      onPartial: (text) => setDraft(text),
    });
    sttRef.current = stt;
    setListening(Boolean(stt));
  }, [listening, loading]);

  const copyText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }, []);

  const downloadProposal = useCallback(() => {
    if (!proposalDraft) return;
    const blob = new Blob([proposalDraft.fullText], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${proposalDraft.draftId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [proposalDraft]);

  const grouped = useMemo(() => {
    const out: Array<{ day: string; items: ChanakyaInappMessage[] }> = [];
    for (const msg of messages) {
      const day = formatDay(msg.createdAt) || "Today";
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(msg);
      else out.push({ day, items: [msg] });
    }
    return out;
  }, [messages]);

  const entity = resolveEntity();
  const workspaceHref = proposalDraft
    ? proposalWorkspaceHref(
        proposalDraft.opportunityId,
        authorisedDealId || entity.dealId,
      )
    : null;

  const suggested = prompts.length > 0 ? prompts : CHANAKYA_SUGGESTED_QUESTIONS;
  const contextBits = [
    entity.customer,
    entity.opportunityReference,
    entity.product,
    entity.dealId ? `Deal ${entity.dealId.slice(0, 8)}` : null,
  ].filter(Boolean) as string[];

  return (
    <div
      className={cn("flex h-full min-h-0 flex-col", className)}
      data-chanakya-inapp-conversation="037"
      data-chanakya-conversational="009"
      data-read-only="true"
    >
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border/60 px-3 pb-2 pt-2">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            {onOpenRail ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 md:hidden"
                aria-label="Open chat menu"
                onClick={onOpenRail}
              >
                <Menu className="h-4 w-4" aria-hidden />
              </Button>
            ) : null}
            <p className="truncate text-sm font-semibold text-[var(--ei-ink)]">{sessionTitle}</p>
          </div>

          {contextBits.length ? (
            <p className="truncate text-[11px] text-muted-foreground">{contextBits.join(" · ")}</p>
          ) : null}

          <div className="flex items-center gap-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--ei-teal)]">
              {CHANAKYA_PHASE1_READ_ONLY_INDICATOR}
            </p>
            {retentionNotice ? (
              <p className="text-[10px] leading-snug text-muted-foreground">{retentionNotice}</p>
            ) : null}
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("h-7 gap-1 text-[11px]", showJump ? "opacity-100" : "pointer-events-none opacity-0")}
          onClick={jumpToLatest}
        >
          <ArrowDown className="h-3.5 w-3.5" aria-hidden />
          {CHANAKYA_CHAT_JUMP_TO_LATEST_LABEL}
        </Button>
      </div>

      <div
        id={listId}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        ref={messagesScrollRef}
        data-chanakya-chat-messages="011"
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3 pb-4"
        onScroll={(event) => {
          const el = event.currentTarget;
          const nearBottom = isChanakyaChatNearBottom(el, CHANAKYA_CHAT_NEAR_BOTTOM_PX);
          setFollowLatest(nearBottom);
          setShowJump(!nearBottom);
        }}
      >
        {messages.length === 0 && !loading ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ask a free-form business question. CHANAKYA answers from authorised Catalyst One
              evidence only — advisory, never mutating records.
            </p>
            <div className="flex flex-wrap gap-2">
              {suggested.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  disabled={loading}
                  onClick={() => void sendMessage(prompt.label)}
                  className="rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:border-[var(--ei-teal)]/40 hover:text-foreground disabled:opacity-50"
                >
                  {prompt.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.day} className="space-y-3">
              <p className="text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {group.day}
              </p>
              {group.items.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "max-w-[min(92%,42rem)] rounded-2xl px-3 py-2 shadow-[var(--ei-depth-1)]",
                    msg.role === "user"
                      ? "ml-auto bg-[var(--ei-teal)]/12 text-[var(--ei-ink)]"
                      : "mr-auto border border-border/70 bg-background/90 text-[var(--ei-ink-soft)]",
                  )}
                >
                  <p className="mb-1 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>{msg.role === "user" ? "You" : "CHANAKYA"}</span>
                    <span className="font-normal normal-case">{formatClock(msg.createdAt)}</span>
                  </p>
                  {msg.role === "assistant" ? (
                    <ChanakyaSafeMarkdown text={msg.text} />
                  ) : (
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{msg.text}</p>
                  )}
                  {msg.role === "assistant" && msg.evidence && msg.evidence.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                      {msg.evidence.slice(0, 6).map((item) => (
                        <li key={`${item.href}-${item.dealRef || item.opportunityRef || item.label}`}>
                          <a
                            href={item.href}
                            className="text-[var(--ei-teal)] underline-offset-2 hover:underline"
                          >
                            {item.label || item.dealRef || item.opportunityRef || "Open record"}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {msg.role === "assistant" ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => void copyText(msg.text)}
                      >
                        <Copy className="mr-1 h-3 w-3" aria-hidden />
                        Copy response
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        aria-label="Helpful"
                        onClick={() =>
                          sessionId
                            ? void postChanakyaMessageFeedback({
                                sessionId,
                                messageId: msg.id,
                                feedback: "up",
                              })
                            : undefined
                        }
                      >
                        <ThumbsUp className="h-3 w-3" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        aria-label="Not helpful"
                        onClick={() =>
                          sessionId
                            ? void postChanakyaMessageFeedback({
                                sessionId,
                                messageId: msg.id,
                                feedback: "down",
                              })
                            : undefined
                        }
                      >
                        <ThumbsDown className="h-3 w-3" aria-hidden />
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ))
        )}

        {awaitingFirstToken ? (
          <div className="mr-auto flex items-center gap-2 rounded-2xl border border-border/70 bg-background/90 px-3 py-2 text-sm text-muted-foreground">
            <span className="flex gap-1" aria-label="CHANAKYA is typing">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--ei-teal)]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--ei-teal)] [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--ei-teal)] [animation-delay:240ms]" />
            </span>
            CHANAKYA is writing…
          </div>
        ) : null}

        {streamingText && !awaitingFirstToken ? (
          <div className="mr-auto max-w-[min(92%,42rem)] rounded-2xl border border-border/70 bg-background/90 px-3 py-2 text-[13px]">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              CHANAKYA
            </p>
            <ChanakyaSafeMarkdown text={streamingText} streaming />
          </div>
        ) : null}

        {proposalDraft ? (
          <div data-chanakya-proposal-actions="011">
            <ChanakyaProposalResponse draft={proposalDraft} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={() => void copyText(proposalDraft.fullText)}
              >
                Copy
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={() => {
                  const w = window.open("", "_blank");
                  if (w) {
                    w.document.write(
                      `<pre>${proposalDraft.fullText.replace(/</g, "&lt;")}</pre>`,
                    );
                  }
                }}
              >
                Preview
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={downloadProposal}
              >
                <Download className="mr-1 h-3 w-3" aria-hidden />
                Download
              </Button>
              {workspaceHref ? (
                <Button type="button" size="sm" variant="outline" className="h-7 text-[11px]" asChild>
                  <a href={workspaceHref}>Open Proposal Workspace</a>
                </Button>
              ) : (
                <p className="w-full text-[11px] text-muted-foreground">
                  {CHANAKYA_PHASE1_SELECT_TRANSACTION_MESSAGE}
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <div
          role="alert"
          className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-200"
        >
          <p>{error}</p>
          {lastFailedMessage ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={() => void sendMessage(lastFailedMessage)}
              disabled={loading}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Retry
            </Button>
          ) : null}
        </div>
      ) : null}

      <form
        onSubmit={onSubmit}
        data-chanakya-chat-composer="011"
        className="shrink-0 space-y-2 border-t border-border/60 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
      >
        <div className="relative">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask CHANAKYA about Catalyst One…"
            disabled={false}
            rows={3}
            className="min-h-[4.5rem] resize-y bg-muted/20 pr-24 text-sm"
            aria-controls={listId}
            aria-label="Ask CHANAKYA"
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            <Button
              type="button"
              size="icon"
              variant={listening ? "default" : "outline"}
              className="h-8 w-8"
              onClick={toggleMic}
              disabled={loading}
              aria-label={listening ? "Stop dictation" : "Start dictation"}
              aria-pressed={listening}
            >
              {listening ? <MicOff className="h-4 w-4" aria-hidden /> : <Mic className="h-4 w-4" aria-hidden />}
            </Button>
            {loading ? (
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={stopGenerating}
                aria-label="Stop generating"
              >
                <Square className="h-3.5 w-3.5" aria-hidden />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                className="h-8 w-8"
                disabled={loading || !draft.trim()}
                aria-label="Send question to CHANAKYA"
              >
                <Send className="h-4 w-4" aria-hidden />
              </Button>
            )}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {listening
            ? "Listening…"
            : loading
              ? "Processing…"
              : "Enter to send · Shift+Enter for a new line"}
        </p>
      </form>
    </div>
  );
}
