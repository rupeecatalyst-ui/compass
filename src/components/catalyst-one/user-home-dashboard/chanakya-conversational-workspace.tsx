"use client";

/**
 * CO-C1-CHANAKYA-CHAT-WORKSPACE-UX-011
 * Viewport-locked chat workspace: stationary left rail, scrolling messages, pinned composer.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, MessageSquarePlus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChanakyaInappConversationPanel } from "@/components/catalyst-one/user-home-dashboard/chanakya-inapp-conversation-panel";
import {
  CHANAKYA_CHAT_RETENTION_NOTICE,
  CHANAKYA_SUGGESTED_QUESTION_GROUP_LABELS,
  CHANAKYA_SUGGESTED_QUESTIONS,
} from "@/constants/chanakya-conversational-intelligence";
import { CHANAKYA_INAPP_CONVERSATION_PROMPTS } from "@/constants/chanakya-inapp-conversation";
import { CHANAKYA_CHAT_RAIL_WIDTH_CLASS } from "@/constants/chanakya-chat-ux";
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
  const [railOpen, setRailOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const closeRail = useCallback(() => {
    setRailOpen(false);
    window.requestAnimationFrame(() => {
      const trigger = document.querySelector<HTMLButtonElement>('[aria-label="Open chat menu"]');
      trigger?.focus();
    });
  }, []);

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

  useEffect(() => {
    if (!railOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeRail();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [railOpen, closeRail]);

  const newChat = useCallback(() => {
    void (async () => {
      try {
        const created = await createChanakyaConversationSession();
        setSessionId(created.sessionId);
        setMessages([]);
        setRailOpen(false);
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
      setRailOpen(false);
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

  const activeTitle =
    recent.find((row) => row.sessionId === sessionId)?.title?.trim() || "New conversation";

  const rail = (
    <>
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

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3" data-chanakya-chat-rail-scroll="011">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Suggested Questions
        </p>
        {groupedQuestions.map((group) => {
          const collapsed = Boolean(collapsedGroups[group.group]);
          return (
            <div key={group.group} className="mb-2">
              <button
                type="button"
                className="mb-1 flex w-full items-center justify-between rounded-md px-1 py-0.5 text-left text-[11px] font-medium text-[var(--ei-ink)]"
                aria-expanded={!collapsed}
                onClick={() =>
                  setCollapsedGroups((prev) => ({ ...prev, [group.group]: !prev[group.group] }))
                }
              >
                {group.label}
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform", collapsed && "-rotate-90")}
                  aria-hidden
                />
              </button>
              {collapsed ? null : (
                <ul className="space-y-0.5">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="w-full rounded-md px-2 py-1 text-left text-[12px] text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        onClick={() => {
                          setQueuedPrompt(item.label);
                          setRailOpen(false);
                        }}
                      >
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}

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
    </>
  );

  return (
    <div
      className="relative flex h-full min-h-0 overflow-hidden rounded-2xl border border-border/70 bg-background/80 shadow-[var(--ei-depth-1)]"
      data-chanakya-chat-workspace="011"
      data-read-only="true"
    >
      <aside
        data-chanakya-chat-rail="011"
        className={cn(
          "hidden h-full shrink-0 flex-col overflow-hidden border-r border-border/70 bg-muted/15 md:flex",
          CHANAKYA_CHAT_RAIL_WIDTH_CLASS,
        )}
      >
        {rail}
      </aside>

      {railOpen ? (
        <div
          className="absolute inset-0 z-40 md:hidden"
          data-chanakya-chat-rail-drawer="011"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close chat menu"
            onClick={() => {
              closeRail();
            }}
          />
          <aside
            className={cn(
              "relative z-10 flex h-full max-w-[20rem] flex-col overflow-hidden bg-background shadow-xl",
              CHANAKYA_CHAT_RAIL_WIDTH_CLASS,
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Chat history"
          >
            <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
              <p className="text-sm font-semibold">Chats</p>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                aria-label="Close chat menu"
                onClick={closeRail}
              >
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            {rail}
          </aside>
        </div>
      ) : null}

      <section className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <ChanakyaInappConversationPanel
          prompts={CHANAKYA_INAPP_CONVERSATION_PROMPTS}
          sessionId={sessionId}
          messages={messages}
          queuedPrompt={queuedPrompt}
          sessionTitle={activeTitle}
          retentionNotice={retention}
          onOpenRail={() => setRailOpen(true)}
          onQueuedPromptConsumed={() => setQueuedPrompt(null)}
          onSessionChange={(id) => {
            setSessionId(id);
            void refreshHistory(query);
          }}
          onMessagesChange={setMessages}
          className="h-full min-h-0"
        />
      </section>
    </div>
  );
}
