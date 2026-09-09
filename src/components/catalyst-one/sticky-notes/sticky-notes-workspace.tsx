"use client";

/**
 * CO-C1-CONTACT-STRATEGY-STICKY-NOTES-007
 * CO-C1-CATALYST-REFINEMENTS-016 — spacious four-block workspace.
 * Same EmployeePrivateStickyNote store. Owner-only. Never shared activity.
 */

import { useCallback, useEffect, useState } from "react";
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
  updateStickyNote,
} from "@/lib/sticky-notes/client";
import {
  STICKY_NOTE_CONVERT_CONFIRMATION,
  type StickyNoteColor,
  type StickyNotePriority,
  type StickyNoteRecord,
} from "@/types/sticky-notes";
import {
  STICKY_NOTE_WORKSPACE_BLOCKS,
  STICKY_NOTE_WORKSPACE_SUBTITLE,
  STICKY_NOTE_WORKSPACE_TITLE,
} from "@/constants/sticky-notes";
import { cn } from "@/lib/utils";

const COLORS: Array<{ id: StickyNoteColor; label: string }> = [
  { id: "amber", label: "Amber" },
  { id: "teal", label: "Teal" },
  { id: "sky", label: "Sky" },
  { id: "rose", label: "Rose" },
  { id: "violet", label: "Violet" },
  { id: "lime", label: "Lime" },
];

type EditorForm = {
  title: string;
  body: string;
  color: StickyNoteColor;
  priority: StickyNotePriority;
  pinned: boolean;
  reminderAt: string;
  checklistText: string;
  linkKind: string;
  linkId: string;
  linkLabel: string;
};

function emptyForm(): EditorForm {
  return {
    title: "",
    body: "",
    color: "amber",
    priority: "normal",
    pinned: false,
    reminderAt: "",
    checklistText: "",
    linkKind: "",
    linkId: "",
    linkLabel: "",
  };
}

function formFromNote(note: StickyNoteRecord): EditorForm {
  return {
    title: note.title,
    body: note.body,
    color: note.color,
    priority: note.priority,
    pinned: note.pinned,
    reminderAt: note.reminderAt ? note.reminderAt.slice(0, 16) : "",
    checklistText: note.checklist.map((item) => `${item.done ? "[x] " : ""}${item.label}`).join("\n"),
    linkKind: note.linkKind ?? "",
    linkId: note.linkId ?? "",
    linkLabel: note.linkLabel ?? "",
  };
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
  const [form, setForm] = useState<EditorForm>(emptyForm());
  const [convertNote, setConvertNote] = useState<StickyNoteRecord | null>(null);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    if (editing === "new") {
      setForm(emptyForm());
      return;
    }
    if (editing) setForm(formFromNote(editing));
  }, [editing]);

  const selectedId = editing && editing !== "new" ? editing.id : null;

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

  const save = async () => {
    setSaving(true);
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
    try {
      const saved =
        editing === "new"
          ? await createStickyNote(payload)
          : await updateStickyNote((editing as StickyNoteRecord).id, payload);
      toast.success("Private note saved.");
      setEditing(saved);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save note.");
    } finally {
      setSaving(false);
    }
  };

  const blockShell =
    "flex min-h-[14rem] flex-col rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm";

  return (
    <div className="space-y-4">
      <PageHeader
        title={STICKY_NOTE_WORKSPACE_TITLE}
        description={STICKY_NOTE_WORKSPACE_SUBTITLE}
        actions={
          <Button type="button" size="sm" onClick={() => setEditing("new")}>
            <Plus className="mr-1 h-4 w-4" /> New note
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-3 text-card-foreground">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search your private notes"
            className="h-9 bg-background pl-8 text-foreground"
            aria-label="Search sticky notes"
          />
        </div>
        <div className="w-36 space-y-1">
          <Label className="text-[10px] uppercase text-muted-foreground">Colour</Label>
          <Select value={color} onValueChange={(v) => setColor(v as StickyNoteColor | "all")}>
            <SelectTrigger className="h-9 bg-background text-xs text-foreground"><SelectValue /></SelectTrigger>
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
            <SelectTrigger className="h-9 bg-background text-xs text-foreground"><SelectValue /></SelectTrigger>
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
        <div className="space-y-2 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-border bg-card text-card-foreground">
            <p className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Your notes
            </p>
            {!notes.length ? (
              <div className="p-6 text-center">
                <StickyNote className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {archived ? "No archived notes." : "Your private workbench is empty. Create a note only you can see."}
                </p>
              </div>
            ) : (
              <ul className="max-h-[70vh] overflow-y-auto p-2">
                {notes.map((note) => (
                  <li key={note.id}>
                    <button
                      type="button"
                      onClick={() => setEditing(note)}
                      className={cn(
                        "w-full rounded-lg px-3 py-2 text-left",
                        selectedId === note.id
                          ? "bg-accent text-accent-foreground"
                          : "text-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <p className="truncate text-sm font-semibold">{note.title || "Untitled note"}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {note.priority}
                        {note.pinned ? " · Pinned" : ""}
                        {note.linkLabel ? ` · ${note.linkLabel}` : ""}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <section className="min-w-0 space-y-3">
            {!editing ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-card-foreground">
                <p className="text-sm text-muted-foreground">
                  Select a note or create a new one to use the four working areas.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 text-card-foreground">
                  <Select value={form.color} onValueChange={(v) => setForm({ ...form, color: v as StickyNoteColor })}>
                    <SelectTrigger className="h-9 w-36 bg-background text-xs text-foreground"><SelectValue placeholder="Colour" /></SelectTrigger>
                    <SelectContent>
                      {COLORS.map((item) => (
                        <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as StickyNotePriority })}>
                    <SelectTrigger className="h-9 w-36 bg-background text-xs text-foreground"><SelectValue placeholder="Priority" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-foreground"
                    onClick={() => setForm({ ...form, pinned: !form.pinned })}
                  >
                    <Pin className="mr-1 h-3 w-3" /> {form.pinned ? "Unpin" : "Pin"}
                  </Button>
                  {editing !== "new" ? (
                    <>
                      <Button type="button" size="sm" variant="outline" className="text-foreground" onClick={() => setConvertNote(editing)}>
                        Convert to Task
                      </Button>
                      {archived ? (
                        <Button type="button" size="sm" variant="outline" className="text-foreground" onClick={() => void archiveStickyNote(editing.id, "restore").then(load)}>
                          <RotateCcw className="mr-1 h-3 w-3" /> Recover
                        </Button>
                      ) : (
                        <Button type="button" size="sm" variant="outline" className="text-foreground" onClick={() => void archiveStickyNote(editing.id, "archive").then(() => { setEditing(null); return load(); })}>
                          <Archive className="mr-1 h-3 w-3" /> Archive
                        </Button>
                      )}
                      <Button type="button" size="sm" variant="outline" className="text-destructive" onClick={() => void archiveStickyNote(editing.id, "delete").then(() => { setEditing(null); return load(); })}>
                        <Trash2 className="mr-1 h-3 w-3" /> Delete
                      </Button>
                    </>
                  ) : null}
                  <div className="ml-auto flex gap-2">
                    <Button type="button" variant="ghost" className="text-foreground" onClick={() => setEditing(null)}>
                      Close
                    </Button>
                    <Button type="button" disabled={saving} onClick={() => void save()}>
                      {saving ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <article className={blockShell} data-sticky-block={STICKY_NOTE_WORKSPACE_BLOCKS[0].id}>
                    <Label className="text-sm font-semibold text-foreground">{STICKY_NOTE_WORKSPACE_BLOCKS[0].label}</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="Title"
                      className="mt-3 h-11 bg-background text-base text-foreground"
                    />
                  </article>
                  <article className={blockShell} data-sticky-block={STICKY_NOTE_WORKSPACE_BLOCKS[1].id}>
                    <Label className="text-sm font-semibold text-foreground">{STICKY_NOTE_WORKSPACE_BLOCKS[1].label}</Label>
                    <Textarea
                      value={form.body}
                      onChange={(e) => setForm({ ...form, body: e.target.value })}
                      placeholder="Write privately…"
                      className="mt-3 min-h-[10rem] flex-1 bg-background text-sm text-foreground"
                    />
                  </article>
                  <article className={blockShell} data-sticky-block={STICKY_NOTE_WORKSPACE_BLOCKS[2].id}>
                    <Label className="text-sm font-semibold text-foreground">{STICKY_NOTE_WORKSPACE_BLOCKS[2].label}</Label>
                    <Textarea
                      value={form.checklistText}
                      onChange={(e) => setForm({ ...form, checklistText: e.target.value })}
                      placeholder="Checklist — one item per line. Prefix [x] when done."
                      className="mt-3 min-h-[10rem] flex-1 bg-background text-sm text-foreground"
                    />
                  </article>
                  <article className={blockShell} data-sticky-block={STICKY_NOTE_WORKSPACE_BLOCKS[3].id}>
                    <Label className="text-sm font-semibold text-foreground">{STICKY_NOTE_WORKSPACE_BLOCKS[3].label}</Label>
                    <div className="mt-3 grid flex-1 gap-2">
                      <Input
                        type="datetime-local"
                        value={form.reminderAt}
                        onChange={(e) => setForm({ ...form, reminderAt: e.target.value })}
                        className="h-11 bg-background text-foreground"
                        aria-label="Reminder"
                      />
                      <Select value={form.linkKind || "none"} onValueChange={(v) => setForm({ ...form, linkKind: v === "none" ? "" : v })}>
                        <SelectTrigger className="h-11 bg-background text-foreground"><SelectValue placeholder="Related record" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No link</SelectItem>
                          <SelectItem value="contact">Contact</SelectItem>
                          <SelectItem value="company">Company</SelectItem>
                          <SelectItem value="opportunity">Opportunity</SelectItem>
                          <SelectItem value="deal">Deal</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input value={form.linkId} onChange={(e) => setForm({ ...form, linkId: e.target.value })} placeholder="Record id" className="h-11 bg-background text-foreground" />
                      <Input value={form.linkLabel} onChange={(e) => setForm({ ...form, linkLabel: e.target.value })} placeholder="Label" className="h-11 bg-background text-foreground" />
                    </div>
                  </article>
                </div>
              </>
            )}
          </section>
        </div>
      )}

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
