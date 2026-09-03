"use client";

/**
 * CO-C1-CHANAKYA-CONVERSATIONAL-INTELLIGENCE-009
 * True chat workspace: left rail + conversation. No dashboard cards.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageSquarePlus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChanakyaInappConversationPanel } from "@/components/catalyst-one/user-home-dashboard/chanakya-inapp-conversation-panel";
import {
  CHANAKYA_CHAT_RETENTION_NOTICE,
  CHANAKYA_SUGGESTED_QUESTION_GROUP_LABELS,
  CHANAKYA_SUGGESTED_QUESTIONS,
} from "@/constants/chanakya-conversational-intelligence";
import { CHANAKYA_INAPP_CONVERSATION_PROMPTS } from "@/constants/chanakya-inapp-conversation";
import {
  createChanakyaConversationSession,
  listChanakyaConversationSessions,
  loadChanakyaConversationSession,
} from "@/lib/chanakya-inapp-conversation/client";
import type { ChanakyaConversationSessionSummary } from "@/types/chanakya-conversational-intelligence";
import type { ChanakyaInappMessage } from "@/types/chanakya-inapp-conversation";
import { cn } from "@/lib/utils";

const GROUPS = ["today", "transactions", "documents", "lenders_products", "analysis"] as const;

export function ChanakyaConversationalWorkspace() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChanakyaInappMessage[]>([]);
  const [recent, setRecent] = useState<ChanakyaConversationSessionSummary[]>([]);
  const [query, setQuery] = useState("");
  const [retention, setRetention] = useState<string>(CHANAKYA_CHAT_RETENTION_NOTICE);
  const [queuedPrompt, setQueuedPrompt] = useState<string | null>(null);

  const refreshHistory = useCallback(async (search?: string) => {
    try {
      const data = await listChanakyaConversationSessions(search);
      setRecent(data.sessions);
      if (data.retentionNotice) setRetention(data.retentionNotice);
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void refreshHistory(query);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query, refreshHistory]);

  const newChat = useCallback(() => {
    void (async () => {
      try {
        const created = await createChanakyaConversationSession();
        setSessionId(created.sessionId);
        setMessages([]);
        void refreshHistory(query);
      } catch {
        setSessionId(null);
        setMessages([]);
      }
    })();
  }, [query, refreshHistory]);

  const openSession = useCallback(async (id: string) => {
    try {
      const loaded = await loadChanakyaConversationSession(id);
      setSessionId(loaded.sessionId);
      setMessages(loaded.messages);
    } catch {
      /* fail closed */
    }
  }, []);

  const groupedQuestions = useMemo(
    () =>
      GROUPS.map((group) => ({
        group,
        label: CHANAKYA_SUGGESTED_QUESTION_GROUP_LABELS[group],
        items: CHANAKYA_SUGGESTED_QUESTIONS.filter((item) => item.group === group),
      })),
    [],
  );

  return (
    <div
      className="flex min-h-[calc(100dvh-9rem)] overflow-hidden rounded-2xl border border-border/70 bg-background/80 shadow-[var(--ei-depth-1)]"
      data-chanakya-chat-workspace="009"
      data-read-only="true"
    >
      <aside className="flex w-[17.5rem] shrink-0 flex-col border-r border-border/70 bg-muted/15">
        <div className="space-y-2 p-3">
          <Button type="button" className="h-9 w-full justify-start gap-2" onClick={newChat}>
            <MessageSquarePlus className="h-4 w-4" aria-hidden />
            New Chat
          </Button>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search chat history"
              className="h-9 pl-8 text-sm"
              aria-label="Search chat history"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Suggested Questions
          </p>
          {groupedQuestions.map((group) => (
            <div key={group.group} className="mb-3">
              <p className="mb-1 text-[11px] font-medium text-[var(--ei-ink)]">{group.label}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="w-full rounded-md px-2 py-1 text-left text-[12px] text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      onClick={() => setQueuedPrompt(item.label)}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <p className="mb-1.5 mt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Recent Chats
          </p>
          {recent.length === 0 ? (
            <p className="px-2 text-[12px] text-muted-foreground">
              No saved chats in the last four days.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {recent.map((row) => (
                <li key={row.sessionId}>
                  <button
                    type="button"
                    onClick={() => void openSession(row.sessionId)}
                    className={cn(
                      "w-full rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-muted/60",
                      sessionId === row.sessionId
                        ? "bg-[var(--ei-teal)]/12 font-medium text-[var(--ei-ink)]"
                        : "text-muted-foreground",
                    )}
                  >
                    <span className="line-clamp-2">{row.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="border-t border-border/60 px-3 py-2 text-[10px] leading-snug text-muted-foreground">
          {retention}
        </p>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col p-4">
        <ChanakyaInappConversationPanel
          prompts={CHANAKYA_INAPP_CONVERSATION_PROMPTS}
          sessionId={sessionId}
          messages={messages}
          queuedPrompt={queuedPrompt}
          onQueuedPromptConsumed={() => setQueuedPrompt(null)}
          onSessionChange={(id) => {
            setSessionId(id);
            void refreshHistory(query);
          }}
          onMessagesChange={setMessages}
          className="h-full"
        />
      </section>
    </div>
  );
}
