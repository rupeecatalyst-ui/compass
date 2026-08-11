"use client";

/**
 * CO-UX-021 — Quick Business Note create modal.
 * Official enterprise note — not a personal notepad.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ENTERPRISE_BUSINESS_NOTE_CATEGORIES } from "@/constants/enterprise-business-notes";
import { createEnterpriseBusinessNote } from "@/lib/enterprise-business-notes";
import type {
  CreateEnterpriseBusinessNoteInput,
  EnterpriseBusinessNoteCategory,
} from "@/types/enterprise-business-notes";

export type BusinessNotesContext = Omit<
  CreateEnterpriseBusinessNoteInput,
  "body" | "category" | "isPinned"
>;

export function BusinessNoteCreateModal({
  open,
  onOpenChange,
  context,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: BusinessNotesContext;
  onSaved?: () => void;
}) {
  const [body, setBody] = useState("");
  const [category, setCategory] =
    useState<EnterpriseBusinessNoteCategory>("general");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBody("");
    setCategory("general");
  }, [open]);

  const onSave = async () => {
    const text = body.trim();
    if (!text) {
      toast.error("Enter a business note before saving.");
      return;
    }
    setSaving(true);
    try {
      const saved = await createEnterpriseBusinessNote({
        ...context,
        body: text,
        category,
      });
      if (saved) {
        toast.success("Business Note saved.");
        onOpenChange(false);
        onSaved?.();
      } else {
        toast.error("Could not save Business Note.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Business Note</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ebn-body" className="text-xs">
              Note
            </Label>
            <Textarea
              id="ebn-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Meeting summary, discussion, follow-up, risk observation…"
              className="min-h-[160px] resize-y text-sm"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Category (optional)</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as EnterpriseBusinessNoteCategory)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTERPRISE_BUSINESS_NOTE_CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs"
            onClick={() => void onSave()}
            disabled={saving || !body.trim()}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
