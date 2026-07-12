"use client";

import type { Note } from "../types";
import { EmptyState } from "./EmptyState";

export function QuickNotes({ notes }: { notes: Note[] }) {
  return (
    <section
      className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
      aria-labelledby="horizon-notes-heading"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Quick Notes
      </p>
      <h2 id="horizon-notes-heading" className="mt-1 text-sm font-semibold text-zinc-50">
        Planning scratchpad
      </h2>
      {notes.length === 0 ? (
        <EmptyState className="mt-3" title="No notes yet" />
      ) : (
        <ul className="mt-3 space-y-2" role="list">
          {notes.map((note) => (
            <li
              key={note.id}
              className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2"
            >
              <p className="text-sm leading-relaxed text-zinc-200">{note.body}</p>
              <p className="mt-2 text-[10px] uppercase tracking-wider text-zinc-600">
                {note.initiativeTitle ?? "General"} ·{" "}
                {new Date(note.createdAt).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
