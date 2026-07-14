"use client";

import { useMemo, useState } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  EFL_LIBRARY_CATALOGUE,
} from "@/constants/enterprise-foundation-libraries";
import {
  exportEflLibrary,
  importEflLibrary,
  searchEflEntries,
  setEflEntryStatus,
} from "@/lib/enterprise-foundation-libraries";
import type { EflLibraryCode } from "@/types/enterprise-foundation-libraries";
import { EflShell } from "@/components/catalyst-one/enterprise-foundation-libraries/efl-shell";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function EflEntriesBrowser() {
  const [libraryCode, setLibraryCode] = useState<EflLibraryCode | "all">("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [text, setText] = useState("");
  const [tick, setTick] = useState(0);

  const result = useMemo(() => {
    void tick;
    return searchEflEntries({
      libraryCode: libraryCode === "all" ? undefined : libraryCode,
      status,
      text: text.trim() || undefined,
      limit: 200,
    });
  }, [libraryCode, status, text, tick]);

  const refresh = () => setTick((n) => n + 1);

  const handleExport = () => {
    if (libraryCode === "all") {
      toast.message("Select a library", {
        description: "Export requires one Foundation Library.",
      });
      return;
    }
    const envelope = exportEflLibrary(libraryCode);
    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `efl-${libraryCode}-${envelope.exportedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported", {
      description: `${envelope.entries.length} entries from ${libraryCode}.`,
    });
  };

  const handleImport = async () => {
    if (libraryCode === "all") {
      toast.message("Select a library", {
        description: "Import requires one Foundation Library.",
      });
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const raw = await file.text();
        const envelope = JSON.parse(raw) as ReturnType<typeof exportEflLibrary>;
        if (envelope.libraryCode !== libraryCode) {
          toast.message("Library mismatch", {
            description: `File is for ${envelope.libraryCode}; selected ${libraryCode}.`,
          });
          return;
        }
        const result = importEflLibrary(envelope, "merge");
        refresh();
        toast.success("Imported", {
          description: `${result.imported} entries merged (${result.skipped} skipped).`,
        });
      } catch {
        toast.message("Import failed", {
          description: "Could not parse Foundation Library JSON.",
        });
      }
    };
    input.click();
  };

  return (
    <EflShell
      title="Entry Browser"
      description="Search Active/Inactive entries. Import/Export JSON envelopes. Full corpora deferred post-certification."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => void handleImport()}>
            <Upload className="h-3.5 w-3.5" />
            Import
          </Button>
        </div>
      }
    >
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <Select
          value={libraryCode}
          onValueChange={(v) => setLibraryCode(v as EflLibraryCode | "all")}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Library" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All libraries</SelectItem>
            {EFL_LIBRARY_CATALOGUE.map((l) => (
              <SelectItem key={l.libraryCode} value={l.libraryCode}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Input
          className="h-9"
          placeholder="Search label, code, body…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        {result.total} entr{result.total === 1 ? "y" : "ies"} · architecture seeds only
      </p>

      <div className="space-y-2">
        {result.entries.map((entry) => (
          <div
            key={entry.id}
            className="rounded-xl border border-border/60 bg-card/40 px-4 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{entry.label}</p>
                  <StatusPill variant="muted">{entry.entryCode}</StatusPill>
                  <StatusPill variant="muted">{entry.libraryCode}</StatusPill>
                  {entry.status === "active" ? (
                    <StatusPill variant="success">active</StatusPill>
                  ) : (
                    <StatusPill variant="warning">inactive</StatusPill>
                  )}
                </div>
                {entry.body && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                    {entry.body}
                  </p>
                )}
                {entry.remarks && (
                  <p className="mt-1 text-[11px] text-muted-foreground/80">{entry.remarks}</p>
                )}
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="h-7 shrink-0 text-[11px]"
                onClick={() => {
                  setEflEntryStatus(
                    entry.id,
                    entry.status === "active" ? "inactive" : "active",
                  );
                  refresh();
                }}
              >
                Mark {entry.status === "active" ? "Inactive" : "Active"}
              </Button>
            </div>
          </div>
        ))}
        {result.entries.length === 0 && (
          <p className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
            No entries match this search.
          </p>
        )}
      </div>
    </EflShell>
  );
}
