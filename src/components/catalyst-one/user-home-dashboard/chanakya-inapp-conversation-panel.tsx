"use client";

/**
 * CO-CHANAKYA-PHASE1-INAPP-CONVERSATION-CLOSURE-037
 * Interactive Ask CHANAKYA surface — free-form multi-turn, evidence-first.
 */

import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Loader2, RefreshCw, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CHANAKYA_INAPP_CONVERSATION_PROMPTS } from "@/constants/chanakya-inapp-conversation";
import { postChanakyaInappConversationTurn } from "@/lib/chanakya-inapp-conversation/client";
import { getActiveOpportunityContext } from "@/lib/lead-opportunity-journey/active-context";
import type { ChanakyaConversationPrompt } from "@/types/chanakya-dashboard-intelligence";
import type { ChanakyaInappMessage } from "@/types/chanakya-inapp-conversation";
import { cn } from "@/lib/utils";

type Props = {
  prompts?: ChanakyaConversationPrompt[];
  className?: string;
};

export function ChanakyaInappConversationPanel({
  prompts = CHANAKYA_INAPP_CONVERSATION_PROMPTS,
  className,
}: Props) {
  const listId = useId();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChanakyaInappMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, loading]);

  const resolveEntity = useCallback(() => {
    const active = getActiveOpportunityContext();
    return {
      opportunityId: active?.opportunityId?.trim() || null,
      dealId: null as string | null,
    };
  }, []);

  const sendMessage = useCallback(
    async (raw: string) => {
      const message = raw.trim();
      if (!message || loading) return;

      setLoading(true);
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
        const result = await postChanakyaInappConversationTurn({
          sessionId,
          message,
          opportunityId: entity.opportunityId,
          dealId: entity.dealId,
        });
        setSessionId(result.sessionId);
        setMessages(result.messages);
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setDraft(message);
        setLastFailedMessage(message);
        setError(
          err instanceof Error
            ? err.message
            : "Ask CHANAKYA could not complete this turn.",
        );
      } finally {
        setLoading(false);
      }
    },
    [loading, resolveEntity, sessionId],
  );

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
        void sendMessage(draft);
      }
    },
    [draft, sendMessage],
  );

  return (
    <div
      className={cn("space-y-4", className)}
      data-chanakya-inapp-conversation="037"
      data-read-only="true"
    >
      <div
        id={listId}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        className="max-h-[22rem] space-y-3 overflow-y-auto rounded-xl border border-border/60 bg-muted/10 p-3"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ask a free-form business question. CHANAKYA answers from authorised enterprise
            evidence only — advisory, never mutating records.
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "rounded-xl px-3 py-2 text-sm whitespace-pre-wrap",
                msg.role === "user"
                  ? "ml-6 bg-[var(--ei-teal)]/10 text-[var(--ei-ink)]"
                  : "mr-4 border border-border/70 bg-background/90 text-[var(--ei-ink-soft)]",
              )}
            >
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {msg.role === "user" ? "You" : "CHANAKYA"}
              </p>
              <p>{msg.text}</p>
              {msg.role === "assistant" && msg.provenance.length > 0 ? (
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Provenance: {msg.provenance.slice(0, 4).join(" · ")}
                </p>
              ) : null}
            </div>
          ))
        )}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            CHANAKYA is compiling enterprise evidence…
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-200"
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

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="relative">
          <Sparkles
            className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--ei-teal)]"
            aria-hidden
          />
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask CHANAKYA anything about your business…"
            disabled={loading}
            rows={2}
            className="min-h-[2.75rem] resize-y border-dashed bg-muted/20 pl-9 pr-12 text-sm"
            aria-controls={listId}
            aria-label="Ask CHANAKYA"
          />
          <Button
            type="submit"
            size="icon"
            className="absolute bottom-2 right-2 h-8 w-8"
            disabled={loading || !draft.trim()}
            aria-label="Send question to CHANAKYA"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {prompts.map((prompt) => (
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

        <p className="text-[11px] text-muted-foreground">
          Multi-turn conversation uses CHANAKYA Enterprise Read Context. Read-only · no
          FOIR/DSCR/LTV/DBR · OCR gaps stay OCR_REQUIRED / NOT_AVAILABLE.
        </p>
      </form>
    </div>
  );
}
