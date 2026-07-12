"use client";

import type { ReactNode } from "react";
import { cn } from "../cn";
import {
  MC_SECTION_DESCRIPTION,
  MC_SECTION_EYEBROW,
  MC_SECTION_TITLE,
} from "./patterns";

/**
 * Standard Mission Control section header (eyebrow + title + optional description).
 */
export function SectionHeader({
  eyebrow,
  title,
  description,
  titleId,
  className,
  actions,
}: {
  eyebrow: string;
  title?: string;
  description?: string;
  titleId?: string;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <div className={cn("mb-0", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={MC_SECTION_EYEBROW}>{eyebrow}</p>
          {title ? (
            <h2 id={titleId} className={MC_SECTION_TITLE}>
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className={MC_SECTION_DESCRIPTION}>{description}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </div>
  );
}
