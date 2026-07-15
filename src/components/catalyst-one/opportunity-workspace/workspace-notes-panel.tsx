"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/components/providers/auth-provider";
import { OwGlassPanel, OwPanelHeader } from "./workspace-design";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";

interface StrategicNote {
  id: string;
  content: string;
  author: string;
  createdAt: string;
}

const STORAGE_KEY = "catalyst.strategic.notes";

function loadNotes(opportunityId: string): StrategicNote[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${opportunityId}`);
    return raw ? (JSON.parse(raw) as StrategicNote[]) : [];
  } catch {
    return [];
  }
}

function saveNotes(opportunityId: string, notes: StrategicNote[]) {
  localStorage.setItem(`${STORAGE_KEY}:${opportunityId}`, JSON.stringify(notes));
}

/** Simplified Notes — draft area + Save + chronological list. */
export function WorkspaceNotesPanel() {
  const { opportunityId } = useOpportunityWorkspace();
  const { user } = useAuthContext();
  const [draft, setDraft] = useState("");
  const [notes, setNotes] = useState<StrategicNote[]>([]);
  const [savedFlash, setSavedFlash] = useState(false);

  const author =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Platform Admin";

  useEffect(() => {
    if (!opportunityId) return;
    setNotes(loadNotes(opportunityId));
    setDraft("");
  }, [opportunityId]);

  const onSave = () => {
    const content = draft.trim();
    if (!content || !opportunityId) return;
    const next: StrategicNote[] = [
      {
        id: `note-${Date.now()}`,
        content,
        author,
        createdAt: new Date().toISOString(),
      },
      ...notes,
    ];
    setNotes(next);
    saveNotes(opportunityId, next);
    setDraft("");
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1800);
  };

  return (
    <div className="space-y-4">
      <OwGlassPanel>
        <OwPanelHeader
          title="Notes"
          description="Capture planning decisions and customer discussion outcomes."
        />
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a concise decision note…"
          className="mt-3 min-h-[120px] w-full resize-y rounded-md border border-white/10 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40"
        />
        <div className="mt-3 flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={onSave}
            disabled={!draft.trim()}
          >
            <Save className="h-3.5 w-3.5" />
            Save Note
          </Button>
          {savedFlash && <span className="text-[11px] text-emerald-300">Saved</span>}
        </div>
      </OwGlassPanel>

      <OwGlassPanel className="!p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
          Note history
        </p>
        <ul className="mt-3 space-y-2">
          {notes.length === 0 && (
            <li className="rounded-lg border border-dashed border-white/15 px-3 py-6 text-center text-xs text-zinc-500">
              No notes yet. Save the first planning note to start the record.
            </li>
          )}
          {notes.map((n) => (
            <li
              key={n.id}
              className="rounded-lg border border-white/10 bg-zinc-950/45 px-3 py-2.5"
            >
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-100">
                {n.content}
              </p>
              <p className="mt-2 text-[10px] text-zinc-500">
                {n.author} · {new Date(n.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      </OwGlassPanel>
    </div>
  );
}
