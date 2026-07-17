"use client";

import { useState, type ReactNode } from "react";
import { EiVizShell } from "@/components/catalyst-one/executive-intelligence/ei-viz-shell";
import type { EiStoryChapter } from "@/types/executive-intelligence-platform";
import type {
  EiExportPayload,
  EiHoverInsight,
} from "@/types/executive-intelligence-capabilities";

/**
 * Chapter wrapper that guarantees full EI visualization capability set.
 */
export function EiCapableChapter({
  chapter,
  children,
  exportPayload,
  isEmpty,
  emptyMessage,
  error,
  loading,
}: {
  chapter: EiStoryChapter;
  children: (api: {
    onHover: (insight: EiHoverInsight | null) => void;
  }) => ReactNode;
  exportPayload?: EiExportPayload;
  isEmpty?: boolean;
  emptyMessage?: string;
  error?: string | null;
  loading?: boolean;
}) {
  const [hoverInsight, setHoverInsight] = useState<EiHoverInsight | null>(null);

  return (
    <EiVizShell
      chapter={chapter}
      exportPayload={exportPayload}
      isEmpty={isEmpty}
      emptyMessage={emptyMessage}
      error={error}
      loading={loading}
      hoverInsight={hoverInsight}
    >
      {children({ onHover: setHoverInsight })}
    </EiVizShell>
  );
}
