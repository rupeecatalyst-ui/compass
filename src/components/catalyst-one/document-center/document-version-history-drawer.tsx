"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { DocumentCenterVersion } from "@/lib/document-center/versions";

export function DocumentVersionHistoryDrawer({
  open,
  onOpenChange,
  label,
  versions,
  onViewVersion,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  versions: DocumentCenterVersion[];
  onViewVersion: (versionId: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        allowOutsideClose
        overlayClassName="z-[92] bg-zinc-950/45"
        className="z-[93] flex w-[min(100vw,22rem)] flex-col gap-0 bg-background p-0 sm:max-w-sm"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border/60 px-4 py-3 pr-12 text-left">
          <SheetTitle className="text-sm font-semibold">{label}</SheetTitle>
          <SheetDescription className="text-[11px]">Version history</SheetDescription>
        </SheetHeader>
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {versions.length === 0 ? (
            <li className="py-8 text-center text-[11px] text-muted-foreground">No versions yet</li>
          ) : (
            [...versions].reverse().map((v) => (
              <li key={v.id} className="rounded-xl border border-border/70 bg-card p-3">
                <p className="text-xs font-semibold">
                  Version {v.version}
                  {v.isCurrent ? (
                    <span className="ml-1.5 text-[10px] font-medium text-teal-700 dark:text-teal-300">
                      Current Version
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Uploaded by {v.uploadedBy}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(v.uploadedAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <button
                  type="button"
                  className="mt-2 text-[11px] font-semibold text-teal-800 underline-offset-2 hover:underline dark:text-teal-200"
                  onClick={() => {
                    onViewVersion(v.id);
                    onOpenChange(false);
                  }}
                >
                  View this version
                </button>
              </li>
            ))
          )}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
