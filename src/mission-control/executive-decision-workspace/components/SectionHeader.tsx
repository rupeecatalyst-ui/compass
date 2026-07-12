"use client";

import { cn } from "../../shared/cn";
import { MC_SECTION_EYEBROW } from "../../shared/ui/patterns";

export function SectionHeader({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <header className={cn("space-y-1", className)}>
      <p className={MC_SECTION_EYEBROW}>{eyebrow}</p>
      <h2 className="text-lg font-semibold tracking-tight text-zinc-50">{title}</h2>
      {description && <p className="text-xs text-zinc-500">{description}</p>}
    </header>
  );
}
