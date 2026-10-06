"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

/** Portal sheets must follow the actual shell boundary, including either navigation panel. */
export function useDocumentWorkspaceBoundary() {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [boundaryStyle, setBoundaryStyle] = useState<CSSProperties>();
  useEffect(() => {
    const main = anchorRef.current?.closest("main");
    if (!main) return;
    const update = () => {
      const bounds = main.getBoundingClientRect();
      setBoundaryStyle({
        left: window.innerWidth >= 768 ? Math.max(0, bounds.left) : 0,
        right: window.innerWidth >= 768 ? Math.max(0, window.innerWidth - bounds.right) : 0,
        width: "auto", minWidth: 0, maxWidth: "none",
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(main);
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); };
  }, []);
  return { anchorRef, boundaryStyle };
}
