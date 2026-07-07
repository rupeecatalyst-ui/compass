"use client";

import { motion } from "framer-motion";
import {
  FileText,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Phone,
  User,
} from "lucide-react";
import { LOAN_BOARD_STAGE_COLORS, LOAN_BOARD_STAGE_LABELS } from "@/constants/loan-board";
import {
  FINANCIAL_PRIMARY_CLASS,
  FINANCIAL_SECONDARY_CLASS,
  LENDER_NAME_CLASS,
  LOAN_FILE_PRIORITY_STYLES,
  LOAN_FILE_STATUS_STYLES,
} from "@/constants/loan-status";
import { LenderLogo } from "@/components/catalyst-one/shared/lender-logo";
import { formatINR, formatINRCompact } from "@/lib/format-currency";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { LoanBoardDensity, LoanBoardFieldKey } from "@/constants/loan-board";
import type { LoanFile, PipelineStage } from "@/types/catalyst-one";

const densityPadding: Record<LoanBoardDensity, string> = {
  compact: "p-1.5",
  medium: "p-1.5",
  large: "p-2",
};

const loanAmountSize: Record<LoanBoardDensity, string> = {
  compact: "text-sm",
  medium: "text-base",
  large: "text-base",
};

interface LoanBoardCardProps {
  file: LoanFile;
  density: LoanBoardDensity;
  visibleFields: LoanBoardFieldKey[];
  onOpen: (id: string) => void;
  onDragStart: (e: React.DragEvent, fileId: string) => void;
  onMoveStage?: (fileId: string) => void;
  /** UX-04 — Allow external stage visuals (e.g. Lender Pipeline) while reusing card. */
  stageOverride?: { label: string; color: string };
  /** Optional sub-stage label override (e.g. lender case sub-stage). */
  subStageOverride?: string;
  /** Optional extra badges shown under stage badges. */
  extraBadges?: React.ReactNode;
}

export function LoanBoardCard({
  file,
  density,
  visibleFields,
  onOpen,
  onDragStart,
  onMoveStage,
  stageOverride,
  subStageOverride,
  extraBadges,
}: LoanBoardCardProps) {
  const stageColor = stageOverride?.color ?? (LOAN_BOARD_STAGE_COLORS[file.stage as PipelineStage] ?? "#64748b");
  const stageLabel = stageOverride?.label ?? (LOAN_BOARD_STAGE_LABELS[file.stage] ?? file.stage);
  const show = (field: LoanBoardFieldKey) => visibleFields.includes(field);
  const nextTask = file.tasks.find((t) => !t.completed);
  const statusStyle = LOAN_FILE_STATUS_STYLES[file.status];

  return (
    <motion.div
      layout
      layoutId={`board-${file.id}`}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
      className="group relative"
    >
      <div
        draggable
        onDragStart={(e) => onDragStart(e, file.id)}
        onClick={() => onOpen(file.id)}
        onKeyDown={(e) => e.key === "Enter" && onOpen(file.id)}
        role="button"
        tabIndex={0}
        className={cn(
          "cursor-grab active:cursor-grabbing rounded-lg border border-border bg-card/90 backdrop-blur-sm",
          "border-l-[3px] shadow-sm transition-all hover:border-primary/30 hover:bg-card hover:shadow-md",
          densityPadding[density],
          file.isDelayed && "ring-1 ring-destructive/20",
          file.isUrgent && "ring-1 ring-destructive/30",
        )}
        style={{ borderLeftColor: stageColor }}
      >
        {/* 1. Customer */}
        <div className="flex items-start justify-between gap-1">
          {show("customer") && (
            <p className="text-sm font-semibold text-card-foreground leading-tight line-clamp-2 flex-1">
              {file.customerName}
            </p>
          )}
          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                window.open(`tel:${file.customerMobile}`);
              }}
            >
              <Phone className="h-3 w-3" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-muted-foreground hover:text-primary"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => onOpen(file.id)}>
                  <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.open(`tel:${file.customerMobile}`)}>
                  <Phone className="mr-2 h-3.5 w-3.5" /> Call
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <MessageCircle className="mr-2 h-3.5 w-3.5" /> WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onOpen(file.id)}>
                  <FileText className="mr-2 h-3.5 w-3.5" /> Documents
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onMoveStage?.(file.id)}>Move Stage</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 2. Loan Amount */}
        {show("loanAmount") && (
          <p className={cn(loanAmountSize[density], FINANCIAL_PRIMARY_CLASS, "mt-0.5 leading-none")}>
            {formatINRCompact(file.loanAmount)}
          </p>
        )}

        {/* 3. Revenue only */}
        {show("revenue") && (
          <p className={cn(FINANCIAL_SECONDARY_CLASS, "text-xs mt-0.5")}>
            Rev {formatINR(file.expectedRevenue)}
          </p>
        )}

        {/* 4. Product */}
        {show("product") && (
          <p className="text-[11px] text-muted-foreground truncate mt-1">{file.loanProduct}</p>
        )}

        {/* 5. Lender */}
        {show("lender") && (
          <div className="flex items-center gap-1 mt-0.5 min-w-0">
            {show("lenderLogo") && <LenderLogo lender={file.lender} />}
            <span className={cn("text-[11px] truncate", LENDER_NAME_CLASS)}>{file.lender}</span>
          </div>
        )}

        {/* 6. RM */}
        {show("rm") && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate mt-0.5">
            <User className="h-3 w-3 shrink-0 opacity-70" />
            <span className="truncate">{file.relationshipManager}</span>
          </div>
        )}

        {/* Stage + Priority + Ageing + Status + Follow-up */}
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <Badge
            variant="outline"
            className="h-4 px-1 text-[9px] border"
            style={{ borderColor: stageColor, color: stageColor }}
          >
            {stageLabel}
          </Badge>
          {subStageOverride && (
            <Badge variant="outline" className="h-4 px-1 text-[9px] border border-border text-muted-foreground">
              {subStageOverride}
            </Badge>
          )}
          {show("priority") && (
            <Badge
              variant="outline"
              className={cn("h-4 px-1 text-[9px] capitalize border", LOAN_FILE_PRIORITY_STYLES[file.priority].className)}
            >
              {file.priority}
            </Badge>
          )}
        </div>
        {extraBadges && <div className="mt-1">{extraBadges}</div>}

        <div className="mt-0.5 space-y-0 text-[10px] text-muted-foreground leading-snug">
          {show("ageing") && <p>{file.daysInStage}d in stage</p>}
          <p className={cn("font-medium", statusStyle.className)}>{statusStyle.label}</p>
          {show("nextFollowup") && nextTask && (
            <p className="truncate text-foreground/70">
              Follow-up{" "}
              {new Date(nextTask.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
