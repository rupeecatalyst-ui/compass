"use client";

/**
 * CO-MARKETING-MKT-01 / 021 — Compact section nav for Marketing Command Center shells.
 * Single row at desktop widths. Overflow scrolls horizontally with visible controls.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  MARKETING_COMMAND_CENTER_SECTIONS,
  MARKETING_UX_SKIP_LINK_LABEL,
} from "@/constants/enterprise-marketing-engine";
import { cn } from "@/lib/utils";

export function MarketingModuleNav(props: { activeId?: string }) {
  const scrollerRef = useRef<HTMLElement>(null);
  const [canStart, setCanStart] = useState(false);
  const [canEnd, setCanEnd] = useState(false);
  const [overflows, setOverflows] = useState(false);

  const updateOverflow = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const hasOverflow = max > 4;
    setOverflows(hasOverflow);
    setCanStart(el.scrollLeft > 2);
    setCanEnd(max - el.scrollLeft > 2);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateOverflow();
    el.addEventListener("scroll", updateOverflow, { passive: true });
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", updateOverflow);
      observer.disconnect();
    };
  }, [updateOverflow]);

  function shift(direction: -1 | 1) {
    scrollerRef.current?.scrollBy({ left: direction * 240, behavior: "smooth" });
  }

  return (
    <>
      <a className="mkt-skip-link" href="#mkt-main">
        {MARKETING_UX_SKIP_LINK_LABEL}
      </a>
      <div className="mkt-module-nav-shell">
        {overflows ? (
          <button
            type="button"
            className="mkt-module-nav-shift"
            aria-label="Show previous marketing sections"
            disabled={!canStart}
            onClick={() => shift(-1)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
        <nav ref={scrollerRef} aria-label="Marketing module sections" className="mkt-module-nav">
          {MARKETING_COMMAND_CENTER_SECTIONS.map((section) => {
            const active = props.activeId === section.id || (!props.activeId && section.id === "home");
            return (
              <Link
                key={section.id}
                href={section.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {section.title}
              </Link>
            );
          })}
        </nav>
        {overflows ? (
          <button
            type="button"
            className="mkt-module-nav-shift"
            aria-label="Show more marketing sections"
            disabled={!canEnd}
            onClick={() => shift(1)}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>
      <div id="mkt-main" tabIndex={-1} />
    </>
  );
}
