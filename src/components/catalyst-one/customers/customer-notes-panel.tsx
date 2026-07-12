"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CustomerNote, CustomerProfile } from "@/types/catalyst-one";

interface CustomerNotesPanelProps {
  customer: CustomerProfile;
  newNote: string;
  onNewNoteChange: (value: string) => void;
  onSaveNote: () => void;
  onTogglePin: (noteId: string) => void;
  onEditNote: (noteId: string, content: string) => void;
  onDeleteNote: (noteId: string) => void;
}

export function CustomerNotesPanel({
  customer,
  newNote,
  onNewNoteChange,
  onSaveNote,
  onTogglePin,
  onEditNote,
  onDeleteNote,
}: CustomerNotesPanelProps) {
  const sorted = [...customer.notes].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h4 className="text-sm font-semibold text-foreground">Add Note</h4>
        <textarea
          value={newNote}
          onChange={(e) => onNewNoteChange(e.target.value)}
          placeholder="Write an internal note — supports multi-line rich context..."
          rows={5}
          className={cn(
            "min-h-[120px] w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm",
            "ring-offset-background placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        />
        <Button size="sm" className="h-8 text-xs" onClick={onSaveNote}>
          Save Note
        </Button>
      </div>

      <div className="space-y-3">
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          sorted.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onTogglePin={() => onTogglePin(note.id)}
              onEdit={(content) => onEditNote(note.id, content)}
              onDelete={() => onDeleteNote(note.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function NoteCard({
  note,
  onTogglePin,
  onEdit,
  onDelete,
}: {
  note: CustomerNote;
  onTogglePin: () => void;
  onEdit: (content: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.content);

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors",
        note.pinned
          ? "border-primary/40 bg-primary/5 dark:bg-primary/10"
          : "border-border bg-card",
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {note.pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
          <span className="text-[10px] text-muted-foreground">
            {note.createdBy} · {format(new Date(note.createdAt), "dd MMM yyyy · HH:mm")}
          </span>
        </div>
        <div className="flex gap-0.5">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => {
              if (editing) {
                onEdit(draft);
                setEditing(false);
              } else {
                setDraft(note.content);
                setEditing(true);
              }
            }}
          >
            {editing ? "Save" : "Edit"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={onTogglePin}
            title={note.pinned ? "Unpin note" : "Pin note"}
          >
            {note.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="h-7 px-2 text-xs"
            onClick={onDelete}
          >
            Delete
          </Button>
        </div>
      </div>
      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
      ) : (
        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {note.content}
        </div>
      )}
    </div>
  );
}
