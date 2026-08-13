"use client";

/**
 * CO-C1-CONTACT-360 — Explicit Add Relationship (ECM relationship store).
 * For genuinely explicit Contact↔Contact links that cannot be auto-derived.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ECM_RELATIONSHIP_TYPE_LABELS,
  ECM_RELATIONSHIP_TYPES,
  listEcmContacts,
  upsertEcmContactRelationship,
} from "@/lib/enterprise-contact-master";
import type { EcmContact, EcmContactRelationshipType } from "@/types/enterprise-contact-master";

const TYPE_OPTIONS = Object.values(ECM_RELATIONSHIP_TYPES);

export function AddExplicitRelationshipDialog({
  open,
  onOpenChange,
  fromContact,
  actorId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromContact: EcmContact;
  actorId: string;
  onSaved?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [relationshipType, setRelationshipType] =
    useState<EcmContactRelationshipType>("refers_to");
  const [selected, setSelected] = useState<EcmContact | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelected(null);
      setRelationshipType("refers_to");
    }
  }, [open]);

  const matches = listEcmContacts()
    .filter((c) => c.id !== fromContact.id && c.status === "active")
    .filter((c) => {
      const q = query.trim().toLowerCase();
      if (!q) return false;
      return (
        c.name.toLowerCase().includes(q) ||
        c.mobilePrimary?.includes(q) ||
        (c.personalEmail || "").toLowerCase().includes(q) ||
        (c.officialEmail || "").toLowerCase().includes(q)
      );
    })
    .slice(0, 8);

  const save = () => {
    if (!selected) {
      toast.message("Select a related Contact.");
      return;
    }
    setSaving(true);
    try {
      upsertEcmContactRelationship({
        fromContactId: fromContact.id,
        toContactId: selected.id,
        relationshipType,
        actorId,
      });
      toast.success("Relationship saved");
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save relationship");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Relationship</DialogTitle>
          <DialogDescription>
            Explicit Contact↔Contact link for {fromContact.name}. Derived Opportunity / Deal /
            Lender links appear automatically on Contact 360° — use this only when the
            relationship is not already present in enterprise data.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[11px]">Relationship type</Label>
            <Select
              value={relationshipType}
              onValueChange={(v) => setRelationshipType(v as EcmContactRelationshipType)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    {ECM_RELATIONSHIP_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px]">Related Contact</Label>
            <Input
              className="h-9 text-sm"
              placeholder="Search by name, mobile, or email…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
              }}
            />
            {matches.length > 0 ? (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-border/70">
                {matches.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelected(c);
                      setQuery(c.name);
                    }}
                    className="block w-full border-b border-border/50 px-3 py-2 text-left text-xs last:border-b-0 hover:bg-muted/40"
                  >
                    <span className="font-semibold">{c.name}</span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      {c.mobilePrimary}
                      {c.personalEmail || c.officialEmail
                        ? ` · ${c.personalEmail || c.officialEmail}`
                        : ""}
                    </span>
                  </button>
                ))}
              </div>
            ) : query.trim() ? (
              <p className="text-[11px] text-muted-foreground">No matching Contact found.</p>
            ) : null}
            {selected ? (
              <p className="text-[11px] text-teal-700 dark:text-teal-300">
                Selected: {selected.name}
              </p>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving || !selected} onClick={save}>
            {saving ? "Saving…" : "Save Relationship"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
