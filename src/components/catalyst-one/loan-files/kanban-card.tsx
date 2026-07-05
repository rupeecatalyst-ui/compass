"use client";

import { motion } from "framer-motion";
import { Building2, Calendar, User } from "lucide-react";
import { formatINR, formatINRCompact } from "@/lib/format-currency";
import { StatusPill } from "@/components/design-system/status-pill";
import { LoanCardMenu } from "@/components/catalyst-one/loan-files/loan-card-menu";
import { cn } from "@/lib/utils";
import type { LoanFile } from "@/types/catalyst-one";

const priorityVariant = {
  urgent: "error" as const,
  high: "warning" as const,
  medium: "info" as const,
  low: "muted" as const,
};

const statusBadge = {
  on_track: { label: "On Track", variant: "success" as const },
  at_risk: { label: "At Risk", variant: "warning" as const },
  delayed: { label: "Delayed", variant: "error" as const },
  completed: { label: "Completed", variant: "default" as const },
};

interface KanbanCardProps {
  file: LoanFile;
  onOpen: (id: string) => void;
  onDragStart: (e: React.DragEvent, fileId: string) => void;
}

export function KanbanCard({ file, onOpen, onDragStart }: KanbanCardProps) {
  return (
    <motion.div
      layout
      layoutId={file.id}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <div
        draggable
        onDragStart={(e) => onDragStart(e, file.id)}
        onClick={() => onOpen(file.id)}
        className={cn(
          "cursor-grab active:cursor-grabbing rounded-xl border border-border/60 bg-card p-3 shadow-sm",
          "border-l-[3px] transition-shadow",
          file.status === "delayed" ? "border-l-destructive" : file.status === "at_risk" ? "border-l-warning" : file.status === "completed" ? "border-l-primary" : "border-l-accent",
        )}
      >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold leading-tight line-clamp-2 flex-1">{file.customerName}</p>
        <div className="flex items-center gap-1 shrink-0">
          <StatusPill variant={priorityVariant[file.priority]} dot={false} className="text-[10px] capitalize">
            {file.priority}
          </StatusPill>
          <LoanCardMenu file={file} onOpen={() => onOpen(file.id)} />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <StatusPill variant={statusBadge[file.status].variant} className="text-[10px]">
          {statusBadge[file.status].label}
        </StatusPill>
        <p className="text-xs text-muted-foreground truncate">{file.loanProduct}</p>
      </div>

      <p className="text-base font-bold text-primary mb-3">{formatINRCompact(file.loanAmount)}</p>

      <div className="space-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Building2 className="h-3 w-3 shrink-0" />
          <span className="truncate">{file.lender}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <User className="h-3 w-3 shrink-0" />
          <span className="truncate">{file.relationshipManager}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/50 pt-2">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {file.daysInStage}d in stage
        </span>
        <span className="font-medium text-accent">{formatINR(file.expectedRevenue)} rev</span>
      </div>

      <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
          initial={{ width: 0 }}
          animate={{ width: `${file.progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <p className="mt-1.5 text-[10px] text-muted-foreground">
        Disb: {new Date(file.expectedDisbursement).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
      </p>
      </div>
    </motion.div>
  );
}
