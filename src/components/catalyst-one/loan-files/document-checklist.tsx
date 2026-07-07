"use client";

import { Check, Clock, FileCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentCheckStatus, LoanFileDocument } from "@/types/catalyst-one";

const statusConfig: Record<
  DocumentCheckStatus,
  { icon: typeof Check; label: string; className: string }
> = {
  verified: { icon: Check, label: "Verified", className: "text-accent bg-accent/10 border-accent/20" },
  received: { icon: FileCheck, label: "Received", className: "text-primary bg-primary/10 border-primary/20" },
  requested: { icon: Clock, label: "Requested", className: "text-blue-700 bg-blue-600/10 border-blue-600/20 dark:text-blue-300" },
  pending: { icon: Clock, label: "Pending", className: "text-warning bg-warning/10 border-warning/20" },
  rejected: { icon: X, label: "Rejected", className: "text-destructive bg-destructive/10 border-destructive/20" },
};

interface DocumentChecklistProps {
  documents: LoanFileDocument[];
}

export function DocumentChecklist({ documents }: DocumentChecklistProps) {
  const done = documents.filter((d) => d.status === "verified" || d.status === "received").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Document Checklist</h4>
        <span className="text-xs text-muted-foreground">
          {done}/{documents.length} received
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
          style={{ width: `${documents.length ? (done / documents.length) * 100 : 0}%` }}
        />
      </div>
      <div className="space-y-2">
        {documents.map((doc) => {
          const config = statusConfig[doc.status];
          const Icon = config.icon;
          return (
            <div
              key={doc.id}
              className={cn(
                "flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors",
                config.className,
              )}
            >
              <span className="text-sm font-medium">{doc.name}</span>
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <Icon className="h-3.5 w-3.5" />
                {config.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
