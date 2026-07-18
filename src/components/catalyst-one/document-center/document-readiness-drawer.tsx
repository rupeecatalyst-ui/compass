"use client";

import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { reasonForDocument } from "@/lib/document-center/versions";
import { cn } from "@/lib/utils";
import type { EdieChecklistItem, EdieResolvedChecklist } from "@/types/edie-certified-rules";
import { EDIE_ADDRESS_PROOF_GROUP } from "@/constants/edie-certified/document-catalog";
import type { DocumentKpiFilter } from "./document-readiness-card";

function scoringItems(checklist: EdieResolvedChecklist): EdieChecklistItem[] {
  return checklist.items.filter(
    (i) => i.choiceGroupId !== EDIE_ADDRESS_PROOF_GROUP || !i.optional,
  );
}

export function DocumentReadinessDrawer({
  open,
  onOpenChange,
  checklist,
  filter,
  onUpload,
  onTakeMeThere,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checklist: EdieResolvedChecklist;
  filter: DocumentKpiFilter;
  onUpload: (item: EdieChecklistItem) => void;
  onTakeMeThere: (item: EdieChecklistItem) => void;
}) {
  const items = scoringItems(checklist);
  const critical = items.filter((i) => i.critical && !i.complete);
  const pending = items.filter((i) => !i.complete && !i.critical);
  const optional = checklist.items.filter((i) => i.optional && !i.complete);
  const uploaded = items.filter((i) => i.complete);

  const title =
    filter === "critical"
      ? "Critical Documents"
      : filter === "pending"
        ? "Pending Documents"
        : filter === "uploaded"
          ? "Uploaded Documents"
          : filter === "optional"
            ? "Optional Documents"
            : "Document Readiness";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        allowOutsideClose
        overlayClassName="z-[88] bg-zinc-950/50"
        className="z-[89] flex w-[min(100vw,26rem)] flex-col gap-0 border-l border-border/70 bg-background p-0 sm:max-w-md"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border/60 px-4 py-3 pr-12 text-left">
          <SheetTitle className="text-sm font-semibold">{title}</SheetTitle>
          <SheetDescription className="text-[11px] leading-relaxed">
            Why readiness is not 100% — and how to resolve each gap without leaving this workspace.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 scrollbar-thin">
          {(filter === "all" || filter === "readiness" || filter === "critical") && (
            <Bucket
              title="Critical Documents"
              empty="No critical documents pending."
              items={critical}
              tone="critical"
              onUpload={onUpload}
              onTakeMeThere={onTakeMeThere}
              stage={checklist.workflowStage}
            />
          )}
          {(filter === "all" || filter === "readiness" || filter === "pending") && (
            <Bucket
              title="Pending Documents"
              empty="No other pending documents."
              items={filter === "pending" ? items.filter((i) => !i.complete) : pending}
              tone="pending"
              onUpload={onUpload}
              onTakeMeThere={onTakeMeThere}
              stage={checklist.workflowStage}
            />
          )}
          {(filter === "all" || filter === "readiness" || filter === "optional") && (
            <Bucket
              title="Optional Documents"
              empty="No optional gaps."
              items={optional}
              tone="optional"
              onUpload={onUpload}
              onTakeMeThere={onTakeMeThere}
              stage={checklist.workflowStage}
            />
          )}
          {filter === "uploaded" && (
            <Bucket
              title="Uploaded Documents"
              empty="Nothing uploaded yet."
              items={uploaded}
              tone="uploaded"
              onUpload={onUpload}
              onTakeMeThere={onTakeMeThere}
              stage={checklist.workflowStage}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Bucket({
  title,
  empty,
  items,
  tone,
  onUpload,
  onTakeMeThere,
  stage,
}: {
  title: string;
  empty: string;
  items: EdieChecklistItem[];
  tone: "critical" | "pending" | "optional" | "uploaded";
  onUpload: (item: EdieChecklistItem) => void;
  onTakeMeThere: (item: EdieChecklistItem) => void;
  stage: string;
}) {
  return (
    <section>
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="mt-2 text-[11px] text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li
              key={item.typeRef}
              className={cn(
                "rounded-xl border p-3",
                tone === "critical" && "border-rose-500/30 bg-rose-500/[0.05]",
                tone === "pending" && "border-amber-500/25 bg-amber-500/[0.04]",
                tone === "optional" && "border-border/70 bg-muted/20",
                tone === "uploaded" && "border-emerald-500/25 bg-emerald-500/[0.04]",
              )}
            >
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                {reasonForDocument(item)}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Current stage · {stage.replace(/_/g, " ")}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {!item.complete ? (
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 gap-1 text-[11px]"
                    onClick={() => onUpload(item)}
                  >
                    <Upload className="h-3 w-3" />
                    Upload
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                  onClick={() => onTakeMeThere(item)}
                >
                  Take Me There
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
