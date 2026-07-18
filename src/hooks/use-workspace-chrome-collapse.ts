"use client";

import { useEffect, useRef, useState } from "react";
import {
  WORKSPACE_CHROME_COLLAPSE_THRESHOLD_PX,
  WORKSPACE_CHROME_EXPAND_THRESHOLD_PX,
} from "@/constants/enterprise-workspace-ux";

/**
 * Collapses sticky workspace chrome after the user scrolls the nearest scroll parent.
 *
 * Uses hysteresis (collapse vs expand thresholds) so sticky height changes cannot
 * oscillate with browser scroll-anchoring — the root cause of workspace “shake”.
 */
export function useWorkspaceChromeCollapse(
  enabled = true,
  collapseThresholdPx = WORKSPACE_CHROME_COLLAPSE_THRESHOLD_PX,
  expandThresholdPx = WORKSPACE_CHROME_EXPAND_THRESHOLD_PX,
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
      const top = scrollParent.scrollTop;
      setCollapsed((prev) => {
        if (prev) {
          // Stay collapsed until clearly back near the top (hysteresis).
          return top > expandThresholdPx;
        }
        return top > collapseThresholdPx;
      });
    };

    onScroll();
    scrollParent.addEventListener("scroll", onScroll, { passive: true });
    return () => scrollParent.removeEventListener("scroll", onScroll);
  }, [enabled, collapseThresholdPx, expandThresholdPx]);

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
