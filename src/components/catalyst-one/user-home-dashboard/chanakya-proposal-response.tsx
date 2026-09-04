"use client";

/**
 * CO-C1-CHANAKYA-CHAT-WORKSPACE-UX-011 — proposal snapshot + expandable sections.
 * Phase-1 actions remain attached in the conversation panel. Save as Draft stays deferred.
 */

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ChanakyaSafeMarkdown } from "@/components/catalyst-one/user-home-dashboard/chanakya-safe-markdown";
import { buildChanakyaProposalPresentation } from "@/lib/chanakya-chat-ux/proposal-presentation";
import type { ChanakyaCreditProposalDraft } from "@/types/chanakya-credit-proposal";
import { cn } from "@/lib/utils";

export function ChanakyaProposalResponse({
  draft,
}: {
  draft: ChanakyaCreditProposalDraft;
}) {
  const presentation = useMemo(() => buildChanakyaProposalPresentation(draft), [draft]);
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const section of presentation.sections) initial[section.id] = section.defaultOpen;
    return initial;
  });

  return (
    <div
      className="mt-3 space-y-3 rounded-xl border border-[var(--ei-teal)]/25 bg-[var(--ei-teal)]/5 p-3"
      data-chanakya-proposal-response="011"
    >
      <p className="text-[11px] font-medium text-muted-foreground">
        Proposal draft ready · not sent · not saved as a business record
      </p>

      <dl className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {presentation.snapshot.map((item) => (
          <div key={item.label} className="rounded-lg bg-background/70 px-2 py-1.5">
            <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{item.label}</dt>
            <dd className="text-[13px] font-medium text-[var(--ei-ink)]">{item.value}</dd>
          </div>
        ))}
      </dl>

      <div className="space-y-1.5">
        {presentation.sections.map((section) => {
          const expanded = open[section.id] ?? section.defaultOpen;
          return (
            <div
              key={section.id}
              className="overflow-hidden rounded-lg border border-border/60 bg-background/80"
            >
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] font-semibold"
                aria-expanded={expanded}
                onClick={() => setOpen((prev) => ({ ...prev, [section.id]: !expanded }))}
              >
                {section.title}
                <ChevronDown
                  className={cn("h-4 w-4 shrink-0 transition-transform", expanded && "rotate-180")}
                  aria-hidden
                />
              </button>
              {expanded ? (
                <div className="border-t border-border/50 px-3 py-2">
                  <ChanakyaSafeMarkdown text={section.body} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

