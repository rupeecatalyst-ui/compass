"use client";

import { format } from "date-fns";
import { Bot, User } from "lucide-react";
import { EntityButtonLink } from "@/components/catalyst-one/shared/entity-link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CustomerAuditEntry } from "@/types/catalyst-one";

interface CustomerAuditTrailProps {
  entries: CustomerAuditEntry[];
  onOpenLoan?: (fileId: string) => void;
}

export function CustomerAuditTrail({ entries, onOpenLoan }: CustomerAuditTrailProps) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No audit entries recorded.</p>;
  }

  return (
    <div className="relative space-y-0">
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" aria-hidden />
      {entries.map((entry, i) => (
        <div
          key={entry.id}
          className={cn(
            "relative flex gap-4 pb-4 last:pb-0",
            "animate-in fade-in duration-300",
          )}
          style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
        >
          <div
            className={cn(
              "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background",
              entry.source === "system" ? "text-muted-foreground" : "text-primary",
            )}
          >
            {entry.source === "system" ? (
              <Bot className="h-4 w-4" />
            ) : (
              <User className="h-4 w-4" />
            )}
          </div>
          <div className="flex-1 min-w-0 rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <p className="font-medium text-sm text-foreground">{entry.action}</p>
              <Badge variant="outline" className="h-4 text-[9px] capitalize">
                {entry.source}
              </Badge>
            </div>
            {entry.description && (
              <p className="text-xs text-muted-foreground">{entry.description}</p>
            )}
            <p className="text-[10px] text-muted-foreground mt-2">
              {entry.actor} · {format(new Date(entry.timestamp), "dd MMM yyyy · HH:mm")}
            </p>
            {entry.loanFileId && onOpenLoan && (
              <EntityButtonLink
                label="View linked loan"
                className="text-xs mt-1"
                onClick={() => onOpenLoan(entry.loanFileId!)}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
