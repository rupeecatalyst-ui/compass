"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExecutionWorkspaceShell } from "@/components/catalyst-one/execution/execution-workspace-shell";
import { cn } from "@/lib/utils";
import type { LoanLenderExecution, LenderExecutionStatus } from "@/types/catalyst-one";
import { loanLenders, loanManagers } from "@/data/catalyst-one/loan-files";

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function LendersWorkspace({
  lenders,
  updatedBy,
  onChange,
  onTimeline,
}: {
  lenders: LoanLenderExecution[];
  updatedBy: string;
  onChange: (lenders: LoanLenderExecution[]) => void;
  onTimeline: (note: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Partial<LoanLenderExecution>>({
    lender: loanLenders[0] ?? "",
    branch: "",
    relationshipManager: loanManagers[0] ?? "",
    loginDate: new Date().toISOString().slice(0, 10),
    applicationNumber: "",
    status: "active",
    caseSubStage: "",
    remarks: "",
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lenders;
    return lenders.filter((l) => {
      const hay = [
        l.lender,
        l.branch ?? "",
        l.relationshipManager ?? "",
        l.applicationNumber ?? "",
        l.caseSubStage ?? "",
        l.remarks ?? "",
        l.status,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [lenders, search]);

  const statusLabel = lenders.length === 0 ? "No lender assigned" : `${lenders.filter((l) => l.status === "active").length} active`;

  const addLender = () => {
    if (!draft.lender) return;
    const ts = nowIso();
    const lender: LoanLenderExecution = {
      id: newId("lnd"),
      lender: draft.lender,
      branch: draft.branch?.trim() || undefined,
      relationshipManager: draft.relationshipManager?.trim() || undefined,
      loginDate: draft.loginDate?.trim() || undefined,
      applicationNumber: draft.applicationNumber?.trim() || undefined,
      status: (draft.status as LenderExecutionStatus) ?? "active",
      caseSubStage: (draft.caseSubStage as string | undefined)?.trim() || undefined,
      remarks: draft.remarks?.trim() || undefined,
      createdBy: updatedBy,
      updatedBy,
      createdAt: ts,
      updatedAt: ts,
    };
    onChange([lender, ...lenders]);
    onTimeline(`Lender assigned: ${lender.lender}${lender.applicationNumber ? ` · Ref ${lender.applicationNumber}` : ""}`);
    setAdding(false);
  };

  const markClosed = (id: string) => {
    const next = lenders.map((l) =>
      l.id === id ? { ...l, status: "closed" as const, updatedBy, updatedAt: nowIso() } : l,
    );
    const lender = lenders.find((l) => l.id === id);
    onChange(next);
    onTimeline(`Lender closed: ${lender?.lender ?? id}`);
  };

  const remove = (id: string) => {
    const lender = lenders.find((l) => l.id === id);
    onChange(lenders.filter((l) => l.id !== id));
    onTimeline(`Lender removed: ${lender?.lender ?? id}`);
  };

  return (
    <ExecutionWorkspaceShell
      theme="blue"
      title="Lenders"
      subtitle="Track single or multiple lenders for this loan file."
      statusLabel={statusLabel}
      search={search}
      onSearchChange={setSearch}
      actions={
        <Button type="button" size="sm" className="h-8 text-xs" onClick={() => setAdding(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Lender
        </Button>
      }
    >
      {adding && (
        <div className="mb-4 rounded-xl border border-blue-600/20 bg-background/70 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-200">
              Add Lender
            </p>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAdding(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Lender *">
              <Select value={draft.lender ?? ""} onValueChange={(v) => setDraft((d) => ({ ...d, lender: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {loanLenders.map((l) => (
                    <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Branch">
              <Input className="h-8 text-xs" value={draft.branch ?? ""} onChange={(e) => setDraft((d) => ({ ...d, branch: e.target.value }))} />
            </Field>
            <Field label="Relationship Manager">
              <Select
                value={draft.relationshipManager ?? ""}
                onValueChange={(v) => setDraft((d) => ({ ...d, relationshipManager: v }))}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {loanManagers.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Login Date">
              <Input
                type="date"
                className="h-8 text-xs"
                value={(draft.loginDate as string | undefined) ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, loginDate: e.target.value }))}
              />
            </Field>
            <Field label="Application No. / Login Ref">
              <Input className="h-8 text-xs" value={draft.applicationNumber ?? ""} onChange={(e) => setDraft((d) => ({ ...d, applicationNumber: e.target.value }))} />
            </Field>
            <Field label="Status">
              <Select
                value={(draft.status as string | undefined) ?? "active"}
                onValueChange={(v) => setDraft((d) => ({ ...d, status: v as LenderExecutionStatus }))}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active" className="text-xs">Active</SelectItem>
                  <SelectItem value="closed" className="text-xs">Closed</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Current Sub Stage" className="sm:col-span-2 lg:col-span-3">
              <Input className="h-8 text-xs" value={draft.caseSubStage ?? ""} onChange={(e) => setDraft((d) => ({ ...d, caseSubStage: e.target.value }))} />
            </Field>
            <Field label="Remarks" className="sm:col-span-2 lg:col-span-3">
              <Input className="h-8 text-xs" value={draft.remarks ?? ""} onChange={(e) => setDraft((d) => ({ ...d, remarks: e.target.value }))} />
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" className="h-8 text-xs" onClick={addLender}>
              Save Lender
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-4 text-center">
            <p className="text-xs text-muted-foreground">No lenders assigned yet.</p>
          </div>
        ) : (
          filtered.map((l) => (
            <div key={l.id} className="rounded-xl border border-border/70 bg-card p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{l.lender}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {(l.branch ? `Branch: ${l.branch}` : "Branch: —")}{l.applicationNumber ? ` · Ref: ${l.applicationNumber}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    RM: {l.relationshipManager ?? "—"} · Login:{" "}
                    {l.loginDate ? new Date(l.loginDate).toLocaleDateString("en-IN") : "—"}
                  </p>
                  {l.caseSubStage && <p className="mt-1 text-xs text-muted-foreground">Sub Stage: {l.caseSubStage}</p>}
                  {l.remarks && <p className="mt-1 text-xs text-muted-foreground">Remarks: {l.remarks}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                      l.status === "active"
                        ? "border-blue-600/20 bg-blue-600/10 text-blue-800 dark:text-blue-200"
                        : "border-border bg-muted/40 text-muted-foreground",
                    )}
                  >
                    {l.status === "active" ? "Active" : "Closed"}
                  </span>
                  {l.status === "active" && (
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => markClosed(l.id)}>
                      Mark Closed
                    </Button>
                  )}
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => remove(l.id)}>
                    Remove
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-muted-foreground">
                <span>Created: {new Date(l.createdAt).toLocaleString("en-IN")}</span>
                <span>Updated: {new Date(l.updatedAt).toLocaleString("en-IN")}</span>
                <span>Updated By: {l.updatedBy ?? "—"}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </ExecutionWorkspaceShell>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

