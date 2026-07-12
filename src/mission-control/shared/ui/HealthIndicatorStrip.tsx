"use client";

import type { ReactNode } from "react";
import { MC_PANEL_COMPACT, MC_SECTION_EYEBROW, MC_TILE_COMPACT } from "./patterns";

/**
 * Generic health indicator strip for Mission Control surfaces.
 * Domain badges are injected so severity vocabularies stay local.
 */
export function HealthIndicatorStrip<
  T extends { id: string; label: string; detail?: string },
>({
  title,
  indicators,
  renderBadge,
  columnsClassName = "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
}: {
  title: string;
  indicators: readonly T[];
  renderBadge: (item: T) => ReactNode;
  columnsClassName?: string;
}) {
  return (
    <section className={MC_PANEL_COMPACT} aria-label={title}>
      <p className={MC_SECTION_EYEBROW}>{title}</p>
      <ul className={`mt-3 grid gap-2 ${columnsClassName}`} role="list">
        {indicators.map((item) => (
          <li key={item.id} className={MC_TILE_COMPACT}>
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-xs font-medium text-zinc-100">{item.label}</p>
              {renderBadge(item)}
            </div>
            {item.detail ? (
              <p className="mt-1 text-[10px] text-zinc-500">{item.detail}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
