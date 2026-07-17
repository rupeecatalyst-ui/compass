"use client";

import { useEffect, useRef, useState } from "react";
import { WORKSPACE_CHROME_COLLAPSE_THRESHOLD_PX } from "@/constants/enterprise-workspace-ux";

/**
 * Collapses sticky workspace chrome after the user scrolls the nearest scroll parent.
 * Returns a sentinel ref to place at the top of the workspace and the collapsed flag.
 */
export function useWorkspaceChromeCollapse(
  enabled = true,
  thresholdPx = WORKSPACE_CHROME_COLLAPSE_THRESHOLD_PX,
) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setCollapsed(false);
      return;
    }

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const scrollParent = getScrollParent(sentinel);
    if (!scrollParent) return;

    const onScroll = () => {
      const next = scrollParent.scrollTop > thresholdPx;
      setCollapsed((prev) => (prev === next ? prev : next));
    };

    onScroll();
    scrollParent.addEventListener("scroll", onScroll, { passive: true });
    return () => scrollParent.removeEventListener("scroll", onScroll);
  }, [enabled, thresholdPx]);

  return { sentinelRef, collapsed };
}

function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node: HTMLElement | null = el?.parentElement ?? null;
  while (node) {
    const { overflowY } = window.getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") {
      return node;
    }
    node = node.parentElement;
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}
