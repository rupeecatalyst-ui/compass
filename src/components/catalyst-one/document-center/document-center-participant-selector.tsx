"use client";

/**
 * CO-ARCH — Participant / Shared Opportunity selector for Document Center.
 */

import {
  DOCUMENT_CENTER_SHARED_SCOPE_KEY,
  buildDocumentCenterScopeOptions,
  type DocumentCenterScopeKey,
} from "@/constants/opportunity-document-center";
import { cn } from "@/lib/utils";
import type { LoanParticipant } from "@/types/loan-participant";

export function DocumentCenterParticipantSelector({
  participants,
  value,
  onChange,
  className,
}: {
  participants: LoanParticipant[];
  value: DocumentCenterScopeKey;
  onChange: (next: DocumentCenterScopeKey) => void;
  className?: string;
}) {
  const options = buildDocumentCenterScopeOptions(participants);

  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-card/90 p-2.5 shadow-sm",
        className,
      )}
      data-surface="document-center-participant-selector"
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">
          Document Owner
        </p>
        <p className="text-[10px] text-muted-foreground">
          Applicant docs · Shared Opportunity docs
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = value === opt.key;
          const isShared = opt.key === DOCUMENT_CENTER_SHARED_SCOPE_KEY;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              className={cn(
                "h-8 rounded-lg border px-2.5 text-[11px] font-medium transition-colors",
                active &&
                  !isShared &&
                  "border-teal-600 bg-teal-600 text-white shadow-sm",
                active &&
                  isShared &&
                  "border-violet-600 bg-violet-600 text-white shadow-sm",
                !active &&
                  "border-border/70 bg-muted/20 text-muted-foreground hover:border-teal-500/40 hover:bg-teal-500/5 hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
