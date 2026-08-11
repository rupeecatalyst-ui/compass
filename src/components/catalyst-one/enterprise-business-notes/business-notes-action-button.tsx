"use client";

/**
 * CO-UX-021 — Compact Notes icon for workspace Command Bars.
 * Icon-only · minimal chrome · does not redesign workspace headers.
 */

import { useState } from "react";
import { StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BusinessNoteCreateModal,
  type BusinessNotesContext,
} from "./business-note-create-modal";

export function BusinessNotesActionButton({
  context,
  className,
  onSaved,
}: {
  context: BusinessNotesContext;
  className?: string;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={cn("h-8 w-8 shrink-0 p-0", className)}
        onClick={() => setOpen(true)}
        title="Business Notes"
        aria-label="Business Notes"
      >
        <StickyNote className="h-3.5 w-3.5" />
      </Button>
      <BusinessNoteCreateModal
        open={open}
        onOpenChange={setOpen}
        context={context}
        onSaved={onSaved}
      />
    </>
  );
}
