"use client";

import type { ReactNode } from "react";
import type { EiStoryChapter } from "@/types/executive-intelligence-platform";

export function EiInsightChapter({
  chapter,
  children,
}: {
  chapter: EiStoryChapter;
  children: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm sm:p-5">
      <header className="mb-4 border-b border-border/50 pb-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-700/90 dark:text-teal-300/90">
          {chapter.eyebrow}
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">{chapter.headline}</h2>
        <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-muted-foreground">
          {chapter.narrative}
        </p>
        <p className="mt-2 text-[10px] italic text-muted-foreground/90">
          Visualization intelligence: {chapter.whyThisViz}
        </p>
      </header>
      {children}
    </article>
  );
}
