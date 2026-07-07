"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { LenderLogo } from "@/components/catalyst-one/shared/lender-logo";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  LENDER_CASE_STAGES,
  LENDER_CASE_STAGE_COLORS,
  LENDER_CASE_STAGE_LABELS,
  LENDER_PROBABILITY_LABELS,
  getProbabilityStyle,
} from "@/constants/lender-pipeline";
import { LOAN_FILE_PRIORITY_STYLES } from "@/constants/loan-status";
import type { LenderCaseStage, LenderProbability, LoanFile, LoanLenderExecution } from "@/types/catalyst-one";
import { loanLenders } from "@/data/catalyst-one/loan-files";

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatLastUpdated(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const ts = d.getTime();
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  if (ts >= startOfToday) return `Today · ${time}`;
  if (ts >= startOfYesterday) return `Yesterday · ${time}`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + ` · ${time}`;
}

export function LenderPipelineBoard({
  loan,
  cases,
  updatedBy,
  onChange,
  onTimeline,
}: {
  loan: LoanFile;
  cases: LoanLenderExecution[];
  updatedBy: string;
  onChange: (next: LoanLenderExecution[]) => void;
  onTimeline: (note: string) => void;
}) {
  const [dragOverStage, setDragOverStage] = useState<LenderCaseStage | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const casesByStage = useMemo(() => {
    const map = new Map<LenderCaseStage, LoanLenderExecution[]>();
    for (const stage of LENDER_CASE_STAGES) map.set(stage.id, []);
    cases.forEach((c) => {
      const stage = c.caseStage ?? "raw_lead";
      const arr = map.get(stage) ?? [];
      arr.push(c);
      map.set(stage, arr);
    });
    return map;
  }, [cases]);

  const handleDragStart = (e: React.DragEvent, caseId: string) => {
    e.dataTransfer.setData("text/plain", caseId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(caseId);
  };

  const handleDrop = (e: React.DragEvent, stage: LenderCaseStage) => {
    e.preventDefault();
    const caseId = e.dataTransfer.getData("text/plain");
    if (!caseId) return;
    const next = cases.map((c) =>
      c.id === caseId
        ? {
            ...c,
            caseStage: stage,
            updatedBy,
            updatedAt: nowIso(),
          }
        : c,
    );
    const moved = cases.find((c) => c.id === caseId);
    onChange(next);
    onTimeline(
      `Lender moved: ${moved?.lender ?? caseId} → ${LENDER_CASE_STAGE_LABELS[stage]}`,
    );
    setDragOverStage(null);
    setDraggingId(null);
  };

  const addCase = () => {
    const ts = nowIso();
    const lender = loanLenders[0] ?? "HDFC Bank";
    const next: LoanLenderExecution = {
      id: newId("lcase"),
      lender,
      status: "active",
      caseStage: "raw_lead",
      probability: "medium",
      isPrimary: cases.length === 0,
      createdBy: updatedBy,
      updatedBy,
      createdAt: ts,
      updatedAt: ts,
    };
    onChange([next, ...cases]);
    onTimeline(`Lender case created: ${lender}`);
  };

  const setPrimary = (id: string) => {
    const next = cases.map((c) => ({ ...c, isPrimary: c.id === id, updatedBy, updatedAt: nowIso() }));
    const primary = cases.find((c) => c.id === id);
    onChange(next);
    onTimeline(`Primary lender set: ${primary?.lender ?? id}`);
  };

  const updateProbability = (id: string, p: LenderProbability) => {
    const next = cases.map((c) => (c.id === id ? { ...c, probability: p, updatedBy, updatedAt: nowIso() } : c));
    const lender = cases.find((c) => c.id === id);
    onChange(next);
    onTimeline(`Probability updated: ${lender?.lender ?? id} → ${LENDER_PROBABILITY_LABELS[p]}`);
  };

  const removeDraft = (id: string) => {
    const lender = cases.find((c) => c.id === id);
    onChange(cases.filter((c) => c.id !== id));
    onTimeline(`Lender case removed: ${lender?.lender ?? id}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          Drag lender cases across stages. Loan stage remains independent.
        </div>
        <Button type="button" size="sm" className="h-8 text-xs" onClick={addCase}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Lender Case
        </Button>
      </div>

      <div className="h-[calc(100vh-320px)] min-h-[520px] overflow-x-auto overflow-y-hidden scrollbar-thin">
        <div className="flex min-w-max gap-1 h-full">
          {LENDER_CASE_STAGES.map((col) => {
            const colCases = casesByStage.get(col.id) ?? [];
            const isDragOver = dragOverStage === col.id;
            return (
              <div
                key={col.id}
                className={cn("flex shrink-0 flex-col h-full w-[228px]")}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverStage(col.id);
                }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div
                  className={cn(
                    "shrink-0 rounded-t-lg border border-b-0 border-border bg-card/80 backdrop-blur-sm px-2 py-1.5",
                    isDragOver && "border-primary/40 bg-primary/5",
                  )}
                  style={{ borderTopWidth: 3, borderTopColor: col.color }}
                >
                  <h4 className="text-xs font-semibold text-foreground truncate">{col.label}</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {colCases.length} {colCases.length === 1 ? "Case" : "Cases"}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex-1 min-h-0 rounded-b-lg border border-t-0 border-border bg-muted/20 p-1 overflow-y-auto scrollbar-thin",
                    isDragOver && "bg-primary/5 border-primary/30",
                  )}
                >
                  <div className="space-y-0.5">
                    {colCases.map((c) => {
                      const prob = c.probability ?? "medium";

                      return (
                        <div key={c.id} className="relative">
                          <LenderCaseKanbanCard
                            loan={loan}
                            stageLabel={col.label}
                            stageColor={LENDER_CASE_STAGE_COLORS[col.id]}
                            caseExecution={c}
                            probability={prob}
                            onDragStart={handleDragStart}
                            onSetPrimary={() => setPrimary(c.id)}
                            onRemove={() => removeDraft(c.id)}
                            onProbabilityChange={(p) => updateProbability(c.id, p)}
                          />
                        </div>
                      );
                    })}
                    {colCases.length === 0 && (
                      <div
                        className={cn(
                          "flex h-14 items-center justify-center rounded-md border border-dashed border-border text-[10px] text-muted-foreground",
                          isDragOver && "border-primary/40 text-primary",
                        )}
                      >
                        {isDragOver ? "Drop here" : "No cases"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {draggingId && (
          <div
            className="fixed inset-0 z-10 pointer-events-none"
            onDragEnd={() => {
              setDraggingId(null);
              setDragOverStage(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

function LenderCaseKanbanCard({
  loan,
  stageLabel,
  stageColor,
  caseExecution,
  probability,
  onDragStart,
  onSetPrimary,
  onRemove,
  onProbabilityChange,
}: {
  loan: LoanFile;
  stageLabel: string;
  stageColor: string;
  caseExecution: LoanLenderExecution;
  probability: LenderProbability;
  onDragStart: (e: React.DragEvent, caseId: string) => void;
  onSetPrimary: () => void;
  onRemove: () => void;
  onProbabilityChange: (p: LenderProbability) => void;
}) {
  const rm = caseExecution.relationshipManager ?? loan.relationshipManager;
  const sub = caseExecution.caseSubStage;
  const lastUpdated = formatLastUpdated(caseExecution.updatedAt);
  const priority = loan.priority;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, caseExecution.id)}
      role="button"
      tabIndex={0}
      className={cn(
        "cursor-grab active:cursor-grabbing rounded-lg border border-border bg-card/90 backdrop-blur-sm",
        "border-l-[3px] shadow-sm transition-all hover:border-primary/30 hover:bg-card hover:shadow-md",
        "p-1.5",
      )}
      style={{ borderLeftColor: stageColor }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <LenderLogo lender={caseExecution.lender} size="lg" className="rounded-md" />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">{caseExecution.lender}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-1">
              <Badge
                variant="outline"
                className={cn("h-4 px-1 text-[9px] border", getProbabilityStyle(probability).className)}
              >
                {LENDER_PROBABILITY_LABELS[probability]}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "h-4 px-1 text-[9px] border",
                  caseExecution.isPrimary
                    ? "border-emerald-600/25 bg-emerald-600/10 text-emerald-800 dark:text-emerald-200"
                    : "border-border bg-muted/20 text-muted-foreground",
                )}
              >
                {caseExecution.isPrimary ? "Primary" : "Secondary"}
              </Badge>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
              aria-label="More"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={(e) => (e.preventDefault(), onSetPrimary())}>
              Set Primary
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <p className="text-[10px] uppercase text-muted-foreground mb-1">Probability</p>
              <Select value={probability} onValueChange={(v) => onProbabilityChange(v as LenderProbability)}>
                <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(
                    ["very_high", "high", "medium", "low", "very_low", "rejected", "withdrawn"] as LenderProbability[]
                  ).map((p) => (
                    <SelectItem key={p} value={p} className="text-xs">
                      {LENDER_PROBABILITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={(e) => (e.preventDefault(), onRemove())}>
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1">
        <Badge
          variant="outline"
          className="h-4 px-1 text-[9px] border"
          style={{ borderColor: stageColor, color: stageColor }}
        >
          {stageLabel}
        </Badge>
        {sub && (
          <Badge variant="outline" className="h-4 px-1 text-[9px] border border-border text-muted-foreground">
            {sub}
          </Badge>
        )}
        <Badge
          variant="outline"
          className={cn("h-4 px-1 text-[9px] capitalize border", LOAN_FILE_PRIORITY_STYLES[priority].className)}
        >
          {priority}
        </Badge>
      </div>

      <div className="mt-1 space-y-0.5 text-[10px] text-muted-foreground leading-snug">
        <p>Expected ₹ {loan.requiredAmount.toLocaleString("en-IN")}</p>
        <p className="truncate">RM {rm}</p>
        <p>{lastUpdated}</p>
      </div>
    </div>
  );
}

