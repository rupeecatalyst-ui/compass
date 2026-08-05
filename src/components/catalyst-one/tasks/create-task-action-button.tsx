"use client";

/**
 * BAT #27 — Compact Create Task action for frozen workspace toolbars.
 * Does not redesign layouts — drop into existing action rows only.
 */

import { useState } from "react";
import { ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  QuickTaskCreateModal,
  type QuickTaskContext,
} from "@/components/catalyst-one/tasks/quick-task-create-modal";
import { cn } from "@/lib/utils";

export function CreateTaskActionButton({
  context,
  allowEntityPicker,
  className,
  label = "Create Task",
  size = "sm",
  variant = "outline",
}: {
  context?: QuickTaskContext;
  allowEntityPicker?: boolean;
  className?: string;
  label?: string;
  size?: "sm" | "default";
  variant?: "outline" | "default" | "ghost" | "secondary";
}) {
  const [open, setOpen] = useState(false);
  const locked = Boolean(
    context?.contactId || context?.opportunityId || context?.dealId || context?.fileId,
  );
  const showPicker = allowEntityPicker ?? !locked;

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        className={cn("h-8 gap-1.5 text-xs", className)}
        onClick={() => setOpen(true)}
      >
        <ListTodo className="h-3.5 w-3.5" />
        {label}
      </Button>
      <QuickTaskCreateModal
        open={open}
        onOpenChange={setOpen}
        context={context}
        allowEntityPicker={showPicker}
      />
    </>
  );
}
