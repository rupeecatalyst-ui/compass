"use client";

/**
 * CO-C1-CONTACT-STRATEGY-STICKY-NOTES-007
 * Private personal workbench. Owner-only. Never shared activity.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Archive, Pin, Plus, RotateCcw, Search, StickyNote, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  archiveStickyNote,
  convertStickyNoteToTask,
  createStickyNote,
  listStickyNotes,
  reorderStickyNotes,
  updateStickyNote,
} from "@/lib/sticky-notes/client";
import { STICKY_NOTE_CONVERT_CONFIRMATION, type StickyNoteColor, type StickyNotePriority, type StickyNoteRecord } from "@/types/sticky-notes";
import { cn } from "@/lib/utils";

const COLORS: Array<{ id: StickyNoteColor; className: string; label: string }> = [
  { id: "amber", className: "bg-amber-100 border-amber-300 text-amber-950", label: "Amber" },
  { id: "teal", className: "bg-teal-100 border-teal-300 text-teal-950", label: "Teal" },
  { id: "sky", className: "bg-sky-100 border-sky-300 text-sky-950", label: "Sky" },
  { id: "rose", className: "bg-rose-100 border-rose-300 text-rose-950", label: "Rose" },
  { id: "violet", className: "bg-violet-100 border-violet-300 text-violet-950", label: "Violet" },
  { id: "lime", className: "bg-lime-100 border-lime-300 text-lime-950", label: "Lime" },
];

function colorClass(color: StickyNoteColor): string {
  return COLORS.find((item) => item.id === color)?.className ?? COLORS[0].className;
}

export function StickyNotesWorkspace() {
  const [notes, setNotes] = useState<StickyNoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [color, setColor] = useState<StickyNoteColor | "all">("all");
  const [priority, setPriority] = useState<StickyNotePriority | "all">("all");
  const [archived, setArchived] = useState(false);
  const [editing, setEditing] = useState<StickyNoteRecord | "new" | null>(null);
  const [convertNote, setConvertNote] = useState<StickyNoteRecord | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listStickyNotes({
        q,
        color,
        priority,
        archived,
      });
      setNotes(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load sticky notes.");
    } finally {
      setLoading(false);
    }
  }, [q, color, priority, archived]);

  useEffect(() => {
    void load();
  }, [load]);

  const draft = useMemo(() => {
    if (editing === "new") {
      return {
        title: "",
        body: "",
        color: "amber" as StickyNoteColor,
        priority: "normal" as StickyNotePriority,
        pinned: false,
        reminderAt: "",
        checklistText: "",
        linkKind: "",
        linkId: "",
        linkLabel: "",
      };
    }
    if (!editing) return null;
    return {
      title: editing.title,
      body: editing.body,
      color: editing.color,
      priority: editing.priority,
      pinned: editing.pinned,
      reminderAt: editing.reminderAt ? editing.reminderAt.slice(0, 16) : "",
      checklistText: editing.checklist.map((item) => `${item.done ? "[x] " : ""}${item.label}`).join("\n"),
      linkKind: editing.linkKind ?? "",
      linkId: editing.linkId ?? "",
      linkLabel: editing.linkLabel ?? "",
    };
  }, [editing]);

  const [form, setForm] = useState(draft);
  useEffect(() => setForm(draft), [draft]);

  const parseChecklist = (text: string) =>
    text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => ({
        id: `chk_${index + 1}`,
        label: line.replace(/^\[x\]\s*/i, ""),
        done: /^\[x\]/i.test(line),
      }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sticky Notes"
        description="Private personal workbench. Only you can see these notes — they never enter Contact 360, Activity & Dialogue, or shared transaction feeds."
        actions={
          <Button type="button" size="sm" onClick={() => setEditing("new")}>
            <Plus className="mr-1 h-4 w-4" /> New note
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border/70 bg-card p-3">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search your private notes"
            className="h-9 pl-8"
            aria-label="Search sticky notes"
          />
        </div>
        <div className="w-36 space-y-1">
          <Label className="text-[10px] uppercase text-muted-foreground">Colour</Label>
          <Select value={color} onValueChange={(v) => setColor(v as StickyNoteColor | "all")}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All colours</SelectItem>
              {COLORS.map((item) => (
                <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-36 space-y-1">
          <Label className="text-[10px] uppercase text-muted-foreground">Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as StickyNotePriority | "all")}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="button" size="sm" variant={archived ? "default" : "outline"} onClick={() => setArchived((v) => !v)}>
          {archived ? "Viewing archive" : "Archive"}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading your private notes…</p>
      ) : error ? (
        <div className="space-y-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
          <p className="text-sm text-rose-800 dark:text-rose-100">{error}</p>
          <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : !notes.length ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <StickyNote className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            {archived ? "No archived notes." : "Your private workbench is empty. Create a note only you can see."}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {notes.map((note) => (
            <li
              key={note.id}
              draggable={!archived}
              onDragStart={() => setDraggingId(note.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (!draggingId || draggingId === note.id) return;
                const ids = notes.map((item) => item.id);
                const from = ids.indexOf(draggingId);
                const to = ids.indexOf(note.id);
                if (from < 0 || to < 0) return;
                ids.splice(to, 0, ids.splice(from, 1)[0]);
                setNotes((prev) => ids.map((id) => prev.find((item) => item.id === id)!).filter(Boolean));
                void reorderStickyNotes(ids).catch((err: unknown) => {
                  toast.error(err instanceof Error ? err.message : "Unable to reorder.");
                  void load();
                });
                setDraggingId(null);
              }}
            >
              <article className={cn("flex h-full flex-col rounded-xl border p-3 shadow-sm", colorClass(note.color))}>
                <div className="flex items-start justify-between gap-2">
                  <button type="button" className="min-w-0 text-left" onClick={() => setEditing(note)}>
                    <p className="font-semibold leading-snug">{note.title || "Untitled note"}</p>
                    {note.linkLabel ? (
                      <p className="text-[11px] opacity-80">Private link · {note.linkKind} · {note.linkLabel}</p>
                    ) : null}
                  </button>
                  <span className="text-[10px] uppercase tracking-wide">{note.priority}</span>
                </div>
                <p className="mt-2 line-clamp-5 flex-1 text-[13px] whitespace-pre-wrap">{note.body}</p>
                {note.checklist.length ? (
                  <ul className="mt-2 space-y-0.5 text-[12px]">
                    {note.checklist.slice(0, 4).map((item) => (
                      <li key={item.id} className={item.done ? "line-through opacity-60" : ""}>
                        {item.done ? "☑" : "☐"} {item.label}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {note.reminderAt ? (
                  <p className="mt-2 text-[11px]">Reminder {new Date(note.reminderAt).toLocaleString("en-IN")}</p>
                ) : null}
                {note.convertedTaskId ? (
                  <p className="mt-1 text-[11px]">Task {note.convertedTaskId.slice(0, 8)}…</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-1">
                  <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => void updateStickyNote(note.id, { pinned: !note.pinned }).then(load)}>
                    <Pin className="mr-1 h-3 w-3" /> {note.pinned ? "Unpin" : "Pin"}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConvertNote(note)}>
                    Convert to Task
                  </Button>
                  {archived ? (
                    <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => void archiveStickyNote(note.id, "restore").then(load)}>
                      <RotateCcw className="mr-1 h-3 w-3" /> Recover
                    </Button>
                  ) : (
                    <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => void archiveStickyNote(note.id, "archive").then(load)}>
                      <Archive className="mr-1 h-3 w-3" /> Archive
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => void archiveStickyNote(note.id, "delete").then(load)}>
                    <Trash2 className="mr-1 h-3 w-3" /> Delete
                  </Button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={Boolean(editing) && Boolean(form)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg" allowOutsideClose>
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "New private note" : "Edit private note"}</DialogTitle>
            <DialogDescription>This note stays in your personal workbench. Linking a record does not share the note.</DialogDescription>
          </DialogHeader>
          {form ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const payload = {
                  title: form.title,
                  body: form.body,
                  color: form.color,
                  priority: form.priority,
                  pinned: form.pinned,
                  reminderAt: form.reminderAt ? new Date(form.reminderAt).toISOString() : null,
                  checklist: parseChecklist(form.checklistText),
                  linkKind: (form.linkKind || null) as StickyNoteRecord["linkKind"],
                  linkId: form.linkId || null,
                  linkLabel: form.linkLabel || null,
                };
                const run =
                  editing === "new"
                    ? createStickyNote(payload)
                    : updateStickyNote((editing as StickyNoteRecord).id, payload);
                void run
                  .then(() => {
                    toast.success("Private note saved.");
                    setEditing(null);
                    return load();
                  })
                  .catch((err: unknown) => {
                    toast.error(err instanceof Error ? err.message : "Unable to save note.");
                  });
              }}
            >
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" />
              <Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={5} placeholder="Write privately…" />
              <Textarea
                value={form.checklistText}
                onChange={(e) => setForm({ ...form, checklistText: e.target.value })}
                rows={3}
                placeholder="Checklist — one item per line. Prefix [x] when done."
              />
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.color} onValueChange={(v) => setForm({ ...form, color: v as StickyNoteColor })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Colour" /></SelectTrigger>
                  <SelectContent>
                    {COLORS.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as StickyNotePriority })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input type="datetime-local" value={form.reminderAt} onChange={(e) => setForm({ ...form, reminderAt: e.target.value })} />
              <div className="grid grid-cols-3 gap-2">
                <Select value={form.linkKind || "none"} onValueChange={(v) => setForm({ ...form, linkKind: v === "none" ? "" : v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Link" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No link</SelectItem>
                    <SelectItem value="contact">Contact</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="opportunity">Opportunity</SelectItem>
                    <SelectItem value="deal">Deal</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={form.linkId} onChange={(e) => setForm({ ...form, linkId: e.target.value })} placeholder="Record id" className="h-9" />
                <Input value={form.linkLabel} onChange={(e) => setForm({ ...form, linkLabel: e.target.value })} placeholder="Label" className="h-9" />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(convertNote)} onOpenChange={(open) => !open && setConvertNote(null)}>
        <DialogContent className="sm:max-w-md" allowOutsideClose>
          <DialogHeader>
            <DialogTitle>Convert to Task?</DialogTitle>
            <DialogDescription>{STICKY_NOTE_CONVERT_CONFIRMATION}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setConvertNote(null)}>Cancel</Button>
            <Button
              type="button"
              onClick={() => {
                if (!convertNote) return;
                void convertStickyNoteToTask(convertNote.id, true)
                  .then((result) => {
                    if (result.confirmationRequired) return;
                    toast.success(result.created ? "Task created. Private note kept." : "Existing task reused.");
                    setConvertNote(null);
                    return load();
                  })
                  .catch((err: unknown) => {
                    toast.error(err instanceof Error ? err.message : "Unable to convert.");
                  });
              }}
            >
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
