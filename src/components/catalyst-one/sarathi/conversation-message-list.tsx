"use client";

import { cn } from "@/lib/utils";
import type { EaiConversationMessage } from "@/types/enterprise-ai-conversation-experience";
import { EAI_SARATHI_WELCOME } from "@/constants/enterprise-ai-platform/conversation-experience";

export function ConversationMessageList({
  messages,
  className,
  welcomeVariant = "customer",
  streamingText,
}: {
  messages: EaiConversationMessage[];
  className?: string;
  welcomeVariant?: "customer" | "partner";
  /** In-progress assistant reply (presentation stream) */
  streamingText?: string | null;
}) {
  if (messages.length === 0 && !streamingText) {
    return (
      <div className={cn("flex flex-col justify-center px-1 py-6 sm:py-8", className)}>
        <p className="font-display text-3xl tracking-tight text-foreground sm:text-[2.15rem]">
          {EAI_SARATHI_WELCOME.brand}
        </p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {welcomeVariant === "partner"
            ? "Partner advisory"
            : EAI_SARATHI_WELCOME.tagline}
        </p>
        <p className="mt-6 max-w-md whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">
          {welcomeVariant === "partner"
            ? "Hello.\n\nI'm SARATHI.\n\nYour Financial Intelligence Partner.\n\nHow can I support you today?"
            : EAI_SARATHI_WELCOME.message}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3.5", className)} role="log" aria-live="polite">
      {messages.map((m) => {
        const isUser = m.role === "user";
        return (
          <div
            key={m.messageId}
            className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[min(36rem,88%)] text-[15px] leading-relaxed",
                isUser
                  ? "rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-primary-foreground shadow-sm"
                  : "rounded-2xl rounded-bl-md bg-background px-3.5 py-2.5 text-foreground shadow-sm ring-1 ring-border/50",
              )}
            >
              {!isUser ? (
                <p className="mb-1 text-[10px] font-semibold tracking-[0.16em] text-teal-700/75 dark:text-teal-300/75">
                  SARATHI
                </p>
              ) : null}
              <p className="whitespace-pre-wrap">{m.text}</p>
            </div>
          </div>
        );
      })}
      {streamingText != null && streamingText.length > 0 ? (
        <div className="flex w-full justify-start">
          <div className="max-w-[min(36rem,88%)] rounded-2xl rounded-bl-md bg-background px-3.5 py-2.5 text-[15px] leading-relaxed text-foreground shadow-sm ring-1 ring-border/50">
            <p className="mb-1 text-[10px] font-semibold tracking-[0.16em] text-teal-700/75 dark:text-teal-300/75">
              SARATHI
            </p>
            <p className="whitespace-pre-wrap">
              {streamingText}
              <span
                className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-teal-700/60 align-middle"
                aria-hidden
              />
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
