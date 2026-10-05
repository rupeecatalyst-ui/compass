"use client";

import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shared geometry for every governed COMPASS question. */
export const GOVERNED_QUESTION_COLUMN = "mx-auto flex w-full max-w-md flex-col gap-6";

export const GOVERNED_CONTROL =
  "h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] text-sm outline-none focus-within:border-primary/35";

export function DiscoveryQuestionFrame({
  label,
  helpText,
  children,
  message,
  action,
}: {
  label: string;
  helpText?: string;
  children: ReactNode;
  message?: string | null;
  action?: { label: string; disabled: boolean; onClick: () => void } | null;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className={GOVERNED_QUESTION_COLUMN}>
        <header className="space-y-2 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{label}</h2>
          {helpText ? <p className="text-sm text-muted-foreground">{helpText}</p> : null}
        </header>
        <div className="w-full">{children}</div>
        <p className="min-h-5 text-center text-sm text-muted-foreground" role={message ? "alert" : undefined}>
          {message || ""}
        </p>
        {action ? (
          <Button
            size="lg"
            className="h-12 w-full"
            disabled={action.disabled}
            onClick={action.onClick}
          >
            {action.label}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
