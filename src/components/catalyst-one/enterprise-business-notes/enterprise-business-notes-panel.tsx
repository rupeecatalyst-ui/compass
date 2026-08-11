"use client";

/**
 * CO-UX-021 — Enterprise Business Notes panel (chronological · pinned · searchable).
 */

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Pin, PinOff, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ENTERPRISE_BUSINESS_NOTE_CATEGORIES } from "@/constants/enterprise-business-notes";
import {
  listEnterpriseBusinessNotes,
  subscribeBusinessNotesUpdated,
  updateEnterpriseBusinessNote,
} from "@/lib/enterprise-business-notes";
import { cn } from "@/lib/utils";
import type {
  EnterpriseBusinessNote,
  ListEnterpriseBusinessNotesQuery,
} from "@/types/enterprise-business-notes";
import type { BusinessNotesContext } from "./business-note-create-modal";
import { BusinessNotesActionButton } from "./business-notes-action-button";

function categoryLabel(id: string): string {
  return (
    ENTERPRISE_BUSINESS_NOTE_CATEGORIES.find((c) => c.id === id)?.label ?? id
  );
}

export function EnterpriseBusinessNotesPanel({
  context,
  query,
  className,
  compact,
}: {
  context: BusinessNotesContext;
  /** Override list filters (defaults from context). */
  query?: ListEnterpriseBusinessNotesQuery;
  className?: string;
  compact?: boolean;
}) {
  const [notes, setNotes] = useState<EnterpriseBusinessNote[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const listQuery: ListEnterpriseBusinessNotesQuery = query ?? {
    entityKind: context.entityKind,
    entityId: context.entityId,
    opportunityId: context.opportunityId ?? undefined,
    dealId: context.dealId ?? undefined,
    contactId: context.contactId ?? undefined,
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const items = await listEnterpriseBusinessNotes({
        ...listQuery,
        q: q.trim() || undefined,
        limit: 100,
      });
      setNotes(items);
    } finally {
      setLoading(false);
    }
  }, [
    listQuery.entityKind,
    listQuery.entityId,
    listQuery.opportunityId,
    listQuery.dealId,
    listQuery.contactId,
    q,
  ]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return subscribeBusinessNotesUpdated(() => {
      void refresh();
    });
  }, [refresh]);

  const onPin = async (note: EnterpriseBusinessNote) => {
    const saved = await updateEnterpriseBusinessNote({
      id: note.id,
      isPinned: !note.isPinned,
    });
    if (saved) {
      toast.success(saved.isPinned ? "Note pinned." : "Note unpinned.");
      void refresh();
    }
  };

  const onSoftDelete = async (note: EnterpriseBusinessNote) => {
    const saved = await updateEnterpriseBusinessNote({
      id: note.id,
      softDelete: true,
      deletionReason: "Soft delete from Notes panel",
    });
    if (saved) {
      toast.success("Note removed (soft delete).");
      void refresh();
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search notes…"
            className="h-8 pl-8 text-xs"
          />
        </div>
        <BusinessNotesActionButton context={context} onSaved={() => void refresh()} />
      </div>

      {loading && notes.length === 0 ? (
        <p className="text-xs text-muted-foreground">Loading business notes…</p>
      ) : notes.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No business notes yet. Use the Notes button to capture an observation.
        </p>
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li
              key={note.id}
              className={cn(
                "rounded-lg border p-3",
                note.isPinned
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-card",
                compact && "p-2.5",
              )}
            >
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {note.isPinned ? (
                      <Pin className="h-3 w-3 shrink-0 text-primary" />
                    ) : null}
                    <span className="text-[10px] text-muted-foreground">
                      {note.createdByName ?? "User"} ·{" "}
                      {format(new Date(note.createdAt), "dd MMM yyyy · h:mm a")}
                    </span>
                    <Badge variant="secondary" className="h-5 text-[9px] font-normal">
                      {categoryLabel(String(note.category))}
                    </Badge>
                  </div>
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    title={note.isPinned ? "Unpin" : "Pin"}
                    onClick={() => void onPin(note)}
                  >
                    {note.isPinned ? (
                      <PinOff className="h-3.5 w-3.5" />
                    ) : (
                      <Pin className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-destructive"
                    title="Soft delete"
                    onClick={() => void onSoftDelete(note)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {note.body}
              </p>
              {note.modificationHistory.length > 0 ? (
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  Last modified{" "}
                  {format(new Date(note.updatedAt), "dd MMM yyyy · h:mm a")}
                  {note.updatedByName ? ` · ${note.updatedByName}` : ""} ·{" "}
                  {note.modificationHistory.length} revision
                  {note.modificationHistory.length === 1 ? "" : "s"}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
