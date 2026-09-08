"use client";

import { Button } from "@/components/ui/button";

export function DocumentWorkspaceSelectionBar({
  selectedCount,
  onClear,
  onRequest,
  onSend,
}: {
  selectedCount: number;
  onClear: () => void;
  onRequest: () => void;
  onSend: () => void;
}) {
  return (
    <div
      data-document-workspace-selection="014"
      className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-xs"
    >
      <span className="font-medium">{selectedCount} selected</span>
      <Button type="button" size="sm" variant="ghost" className="h-7" onClick={onClear}>
        Clear selection
      </Button>
      <Button type="button" size="sm" className="h-7" onClick={onRequest}>
        Request Documents
      </Button>
      <Button type="button" size="sm" variant="outline" className="h-7" onClick={onSend}>
        Send Documents
      </Button>
    </div>
  );
}
