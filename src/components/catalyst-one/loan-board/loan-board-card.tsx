"use client";

import { motion } from "framer-motion";
import {
  Archive,
  Briefcase,
  FileText,
  MessageCircle,
  MoreHorizontal,
  PauseCircle,
  Pencil,
  Phone,
  User,
  UserCog,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { LOAN_BOARD_STAGE_COLORS, LOAN_BOARD_STAGES, LOAN_BOARD_STAGE_LABELS } from "@/constants/loan-board";
import {
  FINANCIAL_PRIMARY_CLASS,
  FINANCIAL_SECONDARY_CLASS,
  LENDER_NAME_CLASS,
  LOAN_FILE_PRIORITY_STYLES,
  LOAN_FILE_STATUS_STYLES,
} from "@/constants/loan-status";
import { ROUTES } from "@/constants/routes";
import { LenderLogo } from "@/components/catalyst-one/shared/lender-logo";
import { formatINR, formatINRCompact } from "@/lib/format-currency";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
  selected?: boolean;
  managers?: readonly string[];
  onOpen: (id: string) => void;
  onToggleSelect?: (id: string) => void;
  onDragStart: (e: React.DragEvent, fileId: string) => void;
  onMoveStage?: (fileId: string, stage: PipelineStage) => void;
  onOpenOpportunity?: (fileId: string) => void;
  onChangeOwner?: (fileId: string, owner: string) => void;
  onHold?: (fileId: string) => void;
  onUnhold?: (fileId: string) => void;
  onMarkLost?: (fileId: string) => void;
  onArchive?: (fileId: string) => void;
  onWhatsApp?: (fileId: string, mobile: string) => void;
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
  selected = false,
  managers = [],
  onOpen,
  onToggleSelect,
  onDragStart,
  onMoveStage,
  onOpenOpportunity,
  onChangeOwner,
  onHold,
  onUnhold,
  onMarkLost,
  onArchive,
  onWhatsApp,
  stageOverride,
  subStageOverride,
  extraBadges,
}: LoanBoardCardProps) {
  const router = useRouter();
  const stageColor = stageOverride?.color ?? (LOAN_BOARD_STAGE_COLORS[file.stage as PipelineStage] ?? "#64748b");
  const stageLabel = stageOverride?.label ?? (LOAN_BOARD_STAGE_LABELS[file.stage] ?? file.stage);
  const show = (field: LoanBoardFieldKey) => visibleFields.includes(field);
  const nextTask = file.tasks.find((t) => !t.completed);
  const statusStyle = LOAN_FILE_STATUS_STYLES[file.status];
  const isOnHold = file.stageSubStatus === "on_hold";
  const isLost = file.stageSubStatus === "lost";

  const handleOpenOpportunity = () => {
    onOpenOpportunity?.(file.id);
    router.push(`${ROUTES.OPPORTUNITY_WORKSPACE}?file=${encodeURIComponent(file.id)}`);
  };

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
          selected && "ring-1 ring-primary/40",
        )}
        style={{ borderLeftColor: stageColor }}
      >
        {/* 1. Customer */}
        <div className="flex items-start justify-between gap-1">
          <div className="flex items-start gap-1.5 flex-1 min-w-0">
            {onToggleSelect && (
              <Checkbox
                checked={selected}
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                onCheckedChange={() => onToggleSelect(file.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Select ${file.customerName}`}
              />
            )}
            {show("customer") && (
              <p className="text-sm font-semibold text-card-foreground leading-tight line-clamp-2 flex-1">
                {file.customerName}
              </p>
            )}
          </div>
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
              <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => onOpen(file.id)}>
                  <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleOpenOpportunity}>
                  <Briefcase className="mr-2 h-3.5 w-3.5" /> Opportunity Workspace
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.open(`tel:${file.customerMobile}`)}>
                  <Phone className="mr-2 h-3.5 w-3.5" /> Call
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onWhatsApp?.(file.id, file.customerMobile)}>
                  <MessageCircle className="mr-2 h-3.5 w-3.5" /> WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onOpen(file.id)}>
                  <FileText className="mr-2 h-3.5 w-3.5" /> Documents
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <UserCog className="mr-2 h-3.5 w-3.5" /> Change owner
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-40">
                    {managers.map((rm) => (
                      <DropdownMenuItem key={rm} onClick={() => onChangeOwner?.(file.id, rm)}>
                        {rm}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Move Stage</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-40">
                    {LOAN_BOARD_STAGES.filter((s) => s.id !== file.stage).map((s) => (
                      <DropdownMenuItem key={s.id} onClick={() => onMoveStage?.(file.id, s.id)}>
                        {s.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                {isOnHold ? (
                  <DropdownMenuItem onClick={() => onUnhold?.(file.id)}>
                    <PauseCircle className="mr-2 h-3.5 w-3.5" /> Unhold
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onHold?.(file.id)}>
                    <PauseCircle className="mr-2 h-3.5 w-3.5" /> Hold
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onMarkLost?.(file.id)}>
                  <XCircle className="mr-2 h-3.5 w-3.5" /> Lost
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onArchive?.(file.id)}>
                  <Archive className="mr-2 h-3.5 w-3.5" /> Archive
                </DropdownMenuItem>
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
          {isOnHold && (
            <Badge variant="outline" className="h-4 px-1 text-[9px] border border-amber-500/40 text-amber-600">
              Hold
            </Badge>
          )}
          {isLost && (
            <Badge variant="outline" className="h-4 px-1 text-[9px] border border-destructive/40 text-destructive">
              Lost
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
