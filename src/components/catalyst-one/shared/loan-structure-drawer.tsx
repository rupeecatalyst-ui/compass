"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Trees,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LoanFile } from "@/types/catalyst-one";
import type { LoanParticipant } from "@/types/loan-participant";
import {
  buildLoanStructureNavigationTree,
  buildLoanStructureSummary,
  filterLoanStructureTree,
  type LoanStructureNavTarget,
  type LoanStructureTreeNode,
} from "@/lib/loan-structure";

const EXPANDED_KEY = "catalyst-one:loan-structure:expanded";

function readExpanded(fileId: string): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(`${EXPANDED_KEY}:${fileId}`);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function writeExpanded(fileId: string, map: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`${EXPANDED_KEY}:${fileId}`, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/** Subtle secondary command-bar control. */
export function LoanStructureTriggerButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className={cn(
        "h-7 gap-1 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground",
        className,
      )}
      onClick={onClick}
    >
      <span aria-hidden>🌳</span>
      Loan Structure
    </Button>
  );
}

/**
 * Reusable Loan Structure navigation drawer — overlays workspace (~340px).
 * Does not resize Kanban or execution content.
 */
export function LoanStructureDrawer({
  open,
  onOpenChange,
  file,
  participants = [],
  onNavigate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: LoanFile | null;
  participants?: LoanParticipant[];
  onNavigate: (target: LoanStructureNavTarget) => void;
}) {
  const fileId = file?.id ?? "";
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !fileId) return;
    const saved = readExpanded(fileId);
    setExpanded(saved);
    setQuery("");
  }, [open, fileId]);

  const summary = useMemo(
    () => (file ? buildLoanStructureSummary(file, participants) : null),
    [file, participants],
  );

  const tree = useMemo(
    () => (file ? buildLoanStructureNavigationTree(file, participants) : []),
    [file, participants],
  );

  const filtered = useMemo(() => filterLoanStructureTree(tree, query), [tree, query]);

  const toggle = (id: string, fallback: boolean) => {
    setExpanded((prev) => {
      const current = prev[id] ?? fallback;
      const next = { ...prev, [id]: !current };
      if (fileId) writeExpanded(fileId, next);
      return next;
    });
  };

  const handleNavigate = (node: LoanStructureTreeNode) => {
    if (!node.target) return;
    setSelectedId(node.id);
    onNavigate(node.target);
    onOpenChange(false);
  };

  const handleAdd = (target: LoanStructureNavTarget, e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate(target);
    onOpenChange(false);
  };

  const isExpanded = (node: LoanStructureTreeNode) =>
    (expanded[node.id] ?? Boolean(node.defaultExpanded)) || Boolean(query.trim());

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        allowOutsideClose
        className={cn(
          "flex w-[min(100vw,340px)] flex-col gap-0 border-l border-border/70 bg-background p-0 shadow-2xl",
          "z-[85] sm:max-w-[340px]",
        )}
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border/60 px-4 py-3 pr-12 text-left">
          <SheetTitle className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
            <Trees className="h-4 w-4 text-teal-700 dark:text-teal-300" aria-hidden />
            Loan Structure
          </SheetTitle>
          <SheetDescription className="text-[11px] leading-relaxed">
            Transaction map — navigate without leaving your workspace.
          </SheetDescription>
        </SheetHeader>

        {!file || !summary ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-muted-foreground">
            Select an opportunity to view Loan Structure.
          </div>
        ) : (
          <>
            <div className="shrink-0 space-y-2 border-b border-border/60 bg-muted/20 px-4 py-3">
              <p className="truncate text-sm font-semibold text-foreground">{summary.borrowerName}</p>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
                <SummaryItem label="Product" value={summary.product} />
                <SummaryItem label="Amount" value={summary.amountLabel} />
                <SummaryItem label="Stage" value={summary.stageLabel} />
                <SummaryItem label="Active Lenders" value={String(summary.activeLenderCount)} />
                <SummaryItem label="Properties" value={String(summary.propertyCount)} />
                <SummaryItem label="Co-Applicants" value={String(summary.coApplicantCount)} />
              </dl>
            </div>

            <div className="shrink-0 border-b border-border/60 px-3 py-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search loan structure…"
                  className="h-8 rounded-md pl-8 text-xs"
                />
                {query ? (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 scrollbar-thin">
              <ul className="space-y-0.5">
                {filtered.map((node) => (
                  <TreeNodeRow
                    key={node.id}
                    node={node}
                    depth={0}
                    selectedId={selectedId}
                    isExpanded={isExpanded}
                    onToggle={toggle}
                    onNavigate={handleNavigate}
                    onAdd={handleAdd}
                  />
                ))}
                {filtered.length === 0 ? (
                  <li className="px-2 py-8 text-center text-[11px] text-muted-foreground">
                    No matching structure nodes
                  </li>
                ) : null}
              </ul>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium text-foreground">{value}</dd>
    </div>
  );
}

function TreeNodeRow({
  node,
  depth,
  selectedId,
  isExpanded,
  onToggle,
  onNavigate,
  onAdd,
}: {
  node: LoanStructureTreeNode;
  depth: number;
  selectedId: string | null;
  isExpanded: (node: LoanStructureTreeNode) => boolean;
  onToggle: (id: string, fallback: boolean) => void;
  onNavigate: (node: LoanStructureTreeNode) => void;
  onAdd: (target: LoanStructureNavTarget, e: React.MouseEvent) => void;
}) {
  const hasChildren = Boolean(node.children && node.children.length > 0);
  const open = isExpanded(node);
  const selected = selectedId === node.id;

  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-0.5 rounded-md pr-1 transition-colors",
          selected ? "bg-teal-500/10 text-teal-950 dark:text-teal-50" : "hover:bg-muted/60",
        )}
        style={{ paddingLeft: `${Math.min(depth, 4) * 12 + 4}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="flex h-7 w-6 shrink-0 items-center justify-center text-muted-foreground"
            onClick={() => onToggle(node.id, Boolean(node.defaultExpanded))}
            aria-expanded={open}
            aria-label={open ? "Collapse" : "Expand"}
          >
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="inline-block w-6 shrink-0" aria-hidden />
        )}

        <button
          type="button"
          className="min-w-0 flex-1 truncate py-1.5 text-left text-[12px] font-medium"
          onClick={() => {
            if (node.target) onNavigate(node);
            else if (hasChildren) onToggle(node.id, Boolean(node.defaultExpanded));
          }}
        >
          <span className="truncate">{node.label}</span>
          {node.hint ? (
            <span className="ml-1.5 truncate text-[10px] font-normal text-muted-foreground">
              {node.hint}
            </span>
          ) : null}
        </button>

        {node.addAction ? (
          <button
            type="button"
            title="Add"
            aria-label={`Add ${node.label}`}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-70 hover:bg-background hover:text-teal-700 hover:opacity-100 dark:hover:text-teal-300"
            onClick={(e) => onAdd(node.addAction!, e)}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {hasChildren ? (
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-out",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <ul className="min-h-0 overflow-hidden">
            {node.children!.map((child) => (
              <TreeNodeRow
                key={child.id}
                node={child}
                depth={depth + 1}
                selectedId={selectedId}
                isExpanded={isExpanded}
                onToggle={onToggle}
                onNavigate={onNavigate}
                onAdd={onAdd}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

/**
 * Convenience wrapper: trigger + drawer for command bars.
 */
export function LoanStructureCommandControl({
  file,
  participants,
  onNavigate,
}: {
  file: LoanFile | null;
  participants?: LoanParticipant[];
  onNavigate: (target: LoanStructureNavTarget) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <LoanStructureTriggerButton onClick={() => setOpen(true)} />
      <LoanStructureDrawer
        open={open}
        onOpenChange={setOpen}
        file={file}
        participants={participants}
        onNavigate={onNavigate}
      />
    </>
  );
}
