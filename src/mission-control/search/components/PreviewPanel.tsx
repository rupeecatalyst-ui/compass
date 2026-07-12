"use client";

import Link from "next/link";
import { EnterpriseEngagementCard } from "@/components/catalyst-one/shared/enterprise-engagement-card";
import { cn } from "../../shared/cn";
import type { SearchPreview } from "../types";
import { EmptyState } from "./EmptyState";

export function PreviewPanel({
  preview,
  className,
}: {
  preview: SearchPreview | null;
  className?: string;
}) {
  if (!preview) {
    return (
      <section className={cn("rounded-xl border border-zinc-800 bg-zinc-950/60 p-4", className)}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Preview
        </p>
        <EmptyState
          className="mt-3"
          title="Select a result"
          description="Preview architecture is ready for module publishers."
        />
      </section>
    );
  }

  return (
    <section
      className={cn("space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4", className)}
      aria-label="Search preview"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Preview
      </p>
      <EnterpriseEngagementCard
        title={preview.title}
        description={preview.summary}
        tone="cyan"
        badge={preview.category.replace("_", " ")}
        meta={preview.sourceModule}
        className="dark:from-zinc-950 dark:to-zinc-900"
      >
        {preview.subtitle ? (
          <p className="mt-2 pl-2 text-xs text-zinc-400">{preview.subtitle}</p>
        ) : null}
      </EnterpriseEngagementCard>

      <ul className="space-y-1.5" role="list">
        {preview.metadata.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2 text-[11px]"
          >
            <span className="text-zinc-500">{row.label}</span>
            <span className="truncate text-zinc-200">{row.value}</span>
          </li>
        ))}
      </ul>

      {preview.navigateAction.href ? (
        <Link
          href={preview.navigateAction.href}
          className="inline-flex w-full items-center justify-center rounded-lg border border-teal-500/35 bg-teal-500/10 px-3 py-2 text-xs font-medium text-teal-100 transition hover:bg-teal-500/15"
        >
          {preview.navigateAction.label}
        </Link>
      ) : (
        <button
          type="button"
          className="inline-flex w-full items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300"
          disabled
        >
          {preview.navigateAction.label}
        </button>
      )}
    </section>
  );
}
