"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TASK_COMMITMENT_OPTIONS,
  TASK_POSTPONE_REASONS,
} from "@/lib/enterprise-task-engine";
import type { EteCommitmentLevel, EtePostponeReason } from "@/types/enterprise-task-engine";

export function TaskCommitmentDialog({
  open,
  onOpenChange,
  taskName,
  newTimelineLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskName: string;
  newTimelineLabel: string;
  onConfirm: (data: {
    commitmentLevel: EteCommitmentLevel;
    postponeReason: EtePostponeReason;
    postponeComment?: string;
  }) => void;
}) {
  const [commitment, setCommitment] = useState<EteCommitmentLevel>("high");
  const [reason, setReason] = useState<EtePostponeReason>("waiting_customer");
  const [comment, setComment] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" allowOutsideClose>
        <DialogHeader>
          <DialogTitle className="text-sm">You have rescheduled this task</DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            <span className="font-medium text-foreground">{taskName}</span> → {newTimelineLabel}. How
            confident are you that it will be completed within the new timeline?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[11px]">Commitment level</Label>
            <Select value={commitment} onValueChange={(v) => setCommitment(v as EteCommitmentLevel)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_COMMITMENT_OPTIONS.map((o) => (
                  <SelectItem key={o.id} value={o.id} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px]">Reason category</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as EtePostponeReason)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_POSTPONE_REASONS.map((o) => (
                  <SelectItem key={o.id} value={o.id} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px]">Comments (optional)</Label>
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="h-9 text-xs"
              placeholder="Add context for the assigner…"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() =>
              onConfirm({
                commitmentLevel: commitment,
                postponeReason: reason,
                postponeComment: comment.trim() || undefined,
              })
            }
          >
            Update Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
