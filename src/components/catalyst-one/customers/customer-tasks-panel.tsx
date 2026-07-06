"use client";

import { format } from "date-fns";
import { categorizeCustomerTasks } from "@/lib/customer-utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CustomerProfile, LoanFile } from "@/types/catalyst-one";

interface CustomerTasksPanelProps {
  customer: CustomerProfile;
  loanFiles?: LoanFile[];
  onOpenLoan: (fileId: string) => void;
}

const BUCKETS = [
  { key: "overdue" as const, label: "Overdue", variant: "destructive" as const },
  { key: "dueToday" as const, label: "Due Today", variant: "default" as const },
  { key: "upcoming" as const, label: "Upcoming", variant: "secondary" as const },
  { key: "completed" as const, label: "Completed", variant: "outline" as const },
];

export function CustomerTasksPanel({
  customer,
  loanFiles,
  onOpenLoan,
}: CustomerTasksPanelProps) {
  const buckets = categorizeCustomerTasks(customer, loanFiles);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {BUCKETS.map(({ key, label, variant }) => {
        const tasks = buckets[key];
        return (
          <section key={key} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/20">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground">{label}</h4>
              <Badge variant={variant} className="h-5 text-[10px]">
                {tasks.length}
              </Badge>
            </div>
            <div className="p-2 space-y-1.5 max-h-64 overflow-y-auto">
              {tasks.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-3">None</p>
              ) : (
                tasks.map((t) => (
                  <button
                    key={`${t.fileId}-${t.id}`}
                    type="button"
                    onClick={() => onOpenLoan(t.fileId)}
                    className={cn(
                      "w-full text-left rounded-lg border border-border/60 px-3 py-2",
                      "hover:border-primary/30 hover:bg-muted/30 transition-colors",
                      t.completed && "opacity-70",
                    )}
                  >
                    <p className={cn("text-sm font-medium", t.completed && "line-through")}>
                      {t.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {t.fileNumber} · {t.loanProduct} · Due {format(new Date(t.dueDate), "dd MMM")}
                    </p>
                  </button>
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
