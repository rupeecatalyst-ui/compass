"use client";

import { useEffect } from "react";

export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options?: { ctrl?: boolean; meta?: boolean; shift?: boolean; enabled?: boolean },
) {
  const { ctrl = false, meta = false, shift = false, enabled = true } = options ?? {};

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      const ctrlMatch = ctrl ? e.ctrlKey : !e.ctrlKey;
      const metaMatch = meta ? e.metaKey : !e.metaKey;
      const shiftMatch = shift ? e.shiftKey : !e.shiftKey;

      if (e.key.toLowerCase() === key.toLowerCase() && ctrlMatch && metaMatch && shiftMatch) {
        e.preventDefault();
        callback();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [key, callback, ctrl, meta, shift, enabled]);
}
