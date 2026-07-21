"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { buildLoanWorkspaceIntelligenceMessages } from "@/lib/loan-workspace/workspace-intelligence";
import { cn } from "@/lib/utils";
import type { LoanFile } from "@/types/catalyst-one";
import type { WorkspaceIntelligenceMessage } from "@/types/workspace-intelligence";

const STYLE_ID = "co112-workspace-intelligence-ribbon-keyframes";

function ensureKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes co112-workspace-intel-scroll {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
  `;
  document.head.appendChild(style);
}

/**
 * CO-SPRINT-112 — Workspace Intelligence Ribbon (Layer 2).
 *
 * Scope: current business entity only (never enterprise-wide).
 * Interaction: read-only ticker. Detail opens via CHANAKYA AI for this workspace.
 */
export function WorkspaceIntelligenceRibbon({
  loan,
  messages: messagesProp,
  className,
}: {
  loan: LoanFile;
  messages?: WorkspaceIntelligenceMessage[];
  className?: string;
}) {
  const messages = useMemo(
    () => messagesProp ?? buildLoanWorkspaceIntelligenceMessages(loan),
    [loan, messagesProp],
  );
  const [paused, setPaused] = useState(false);
  const entityLabel =
    loan.businessDetails?.companyName?.trim() || loan.customerName || "this file";

  useEffect(() => {
    ensureKeyframes();
  }, []);

  return (
    <div
      className={cn(
        "flex h-8 w-full min-w-0 items-center gap-2 border-b border-border/60 bg-emerald-500/[0.04] px-3 sm:px-4",
        className,
      )}
      data-layer="workspace_intelligence"
      data-intelligence-scope="workspace_entity"
      data-entity-id={loan.id}
      role="status"
      aria-label={`CHANAKYA workspace intelligence for ${entityLabel}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-300" />
      <span className="hidden shrink-0 text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-800/80 dark:text-emerald-200/90 sm:inline">
        CHANAKYA
      </span>
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div
          className="pointer-events-none flex w-max select-none items-center gap-6 whitespace-nowrap"
          style={
            paused
              ? undefined
              : { animation: "co112-workspace-intel-scroll 48s linear infinite" }
          }
        >
          {messages.map((item) => (
            <span
              key={item.id}
              className={cn(
                "text-[12px] font-medium",
                item.tone === "danger" && "text-rose-600 dark:text-rose-300",
                item.tone === "warning" && "text-amber-700 dark:text-amber-300",
                item.tone === "success" && "text-emerald-700 dark:text-emerald-300",
                item.tone === "info" && "text-sky-700 dark:text-sky-300",
                item.tone === "default" && "text-foreground/85",
              )}
              data-priority={item.priority}
              data-entity-id={item.entityId}
            >
              <span className="mr-2 text-muted-foreground/40" aria-hidden>
                ·
              </span>
              {item.text}
            </span>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-background to-transparent dark:from-zinc-950" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-5 bg-gradient-to-l from-background to-transparent dark:from-zinc-950" />
      </div>
    </div>
  );
}
