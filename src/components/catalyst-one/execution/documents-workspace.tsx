"use client";

import { useMemo, useState } from "react";
import { Eye, FileCheck, Hand, ShieldCheck, XCircle } from "lucide-react";
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
import type { DocumentCheckStatus, LoanFileDocument } from "@/types/catalyst-one";
import { loanManagers } from "@/data/catalyst-one/loan-files";

type DocumentStatusFilter = DocumentCheckStatus | "all";

function nowIso() {
  return new Date().toISOString();
}

function statusLabel(status: DocumentCheckStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "requested":
      return "Requested";
    case "received":
      return "Received";
    case "verified":
      return "Verified";
    case "rejected":
      return "Rejected";
  }
}

function statusStyle(status: DocumentCheckStatus): string {
  switch (status) {
    case "verified":
      return "border-emerald-600/20 bg-emerald-600/10 text-emerald-900 dark:text-emerald-200";
    case "received":
      return "border-blue-600/20 bg-blue-600/10 text-blue-900 dark:text-blue-200";
    case "requested":
      return "border-violet-600/20 bg-violet-600/10 text-violet-900 dark:text-violet-200";
    case "pending":
      return "border-amber-600/20 bg-amber-600/10 text-amber-900 dark:text-amber-200";
    case "rejected":
      return "border-destructive/20 bg-destructive/10 text-destructive";
  }
}

export function DocumentsWorkspace({
  documents,
  updatedBy,
  onChange,
  onTimeline,
}: {
  documents: LoanFileDocument[];
  updatedBy: string;
  onChange: (documents: LoanFileDocument[]) => void;
  onTimeline: (note: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<DocumentStatusFilter>("all");

  const pendingCount = documents.filter((d) => d.status === "pending" || d.status === "requested").length;
  const statusPill = `${pendingCount} pending`;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((d) => {
      if (filter !== "all" && d.status !== filter) return false;
      if (!q) return true;
      const hay = [
        d.name,
        d.category ?? "",
        d.assignedTo ?? "",
        d.remarks ?? "",
        d.status,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [documents, filter, search]);

  const patchDoc = (id: string, patch: Partial<LoanFileDocument>, note: string) => {
    const ts = nowIso();
    const next = documents.map((d) =>
      d.id === id ? { ...d, ...patch, updatedAt: ts, updatedBy } : d,
    );
    onChange(next);
    onTimeline(note);
  };

  const ensureMeta = (doc: LoanFileDocument): LoanFileDocument => {
    const ts = doc.createdAt ?? nowIso();
    return {
      ...doc,
      category: doc.category ?? "General",
      assignedTo: doc.assignedTo ?? loanManagers[0] ?? updatedBy,
      createdAt: doc.createdAt ?? ts,
      updatedAt: doc.updatedAt ?? ts,
      createdBy: doc.createdBy ?? updatedBy,
      updatedBy: doc.updatedBy ?? updatedBy,
    };
  };

  // Note: we normalize per-row when rendering to avoid write-on-render.

  return (
    <ExecutionWorkspaceShell
      theme="purple"
      title="Documents"
      subtitle="Track document collection workflow (no OCR/AI)."
      statusLabel={statusPill}
      search={search}
      onSearchChange={setSearch}
      actions={
        <div className="flex items-center gap-2">
          <Label className="text-[10px] uppercase text-muted-foreground">Filter</Label>
          <Select value={filter} onValueChange={(v) => setFilter(v as DocumentStatusFilter)}>
            <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All</SelectItem>
              <SelectItem value="pending" className="text-xs">Pending</SelectItem>
              <SelectItem value="requested" className="text-xs">Requested</SelectItem>
              <SelectItem value="received" className="text-xs">Received</SelectItem>
              <SelectItem value="verified" className="text-xs">Verified</SelectItem>
              <SelectItem value="rejected" className="text-xs">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-4 text-center">
            <p className="text-xs text-muted-foreground">No documents match your filters.</p>
          </div>
        ) : (
          filtered.map((raw) => {
            const doc = ensureMeta(raw);
            return (
              <div key={doc.id} className="rounded-xl border border-border/70 bg-card p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{doc.name}</p>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", statusStyle(doc.status))}>
                        {statusLabel(doc.status)}
                      </span>
                      <span className="rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">
                        {doc.category ?? "General"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Assigned To: {doc.assignedTo ?? "—"}{doc.remarks ? ` · ${doc.remarks}` : ""}
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      <Field label="Assigned To">
                        <Select
                          value={doc.assignedTo ?? loanManagers[0] ?? updatedBy}
                          onValueChange={(v) =>
                            patchDoc(doc.id, { assignedTo: v }, `Document assigned: ${doc.name} → ${v}`)
                          }
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {loanManagers.map((m) => (
                              <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Remarks">
                        <Input
                          className="h-8 text-xs"
                          value={doc.remarks ?? ""}
                          onChange={(e) =>
                            patchDoc(doc.id, { remarks: e.target.value }, `Document remark updated: ${doc.name}`)
                          }
                        />
                      </Field>
                      <Field label="Preview">
                        <Button type="button" variant="outline" size="sm" className="h-8 w-full text-xs" disabled>
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          Preview (placeholder)
                        </Button>
                      </Field>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() =>
                        patchDoc(
                          doc.id,
                          { status: "requested", requestedDate: nowIso() },
                          `Document requested: ${doc.name}`,
                        )
                      }
                    >
                      <Hand className="mr-1.5 h-3.5 w-3.5" />
                      Request
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() =>
                        patchDoc(
                          doc.id,
                          { status: "received", receivedDate: nowIso() },
                          `Document received: ${doc.name}`,
                        )
                      }
                    >
                      <FileCheck className="mr-1.5 h-3.5 w-3.5" />
                      Receive
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-600/90"
                      onClick={() =>
                        patchDoc(
                          doc.id,
                          { status: "verified", verifiedDate: nowIso() },
                          `Document verified: ${doc.name}`,
                        )
                      }
                    >
                      <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                      Verify
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() =>
                        patchDoc(doc.id, { status: "rejected" }, `Document rejected: ${doc.name}`)
                      }
                    >
                      <XCircle className="mr-1.5 h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-muted-foreground">
                  <span>Requested: {doc.requestedDate ? new Date(doc.requestedDate).toLocaleString("en-IN") : "—"}</span>
                  <span>Received: {doc.receivedDate ? new Date(doc.receivedDate).toLocaleString("en-IN") : "—"}</span>
                  <span>Verified: {doc.verifiedDate ? new Date(doc.verifiedDate).toLocaleString("en-IN") : "—"}</span>
                  <span>Updated By: {doc.updatedBy ?? "—"}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </ExecutionWorkspaceShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

