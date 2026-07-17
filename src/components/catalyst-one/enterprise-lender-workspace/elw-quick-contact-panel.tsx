"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ELW_HIERARCHY_RANKS } from "@/constants/enterprise-lender-workspace";
import {
  assignElwHierarchyContact,
  getReportingManagerLabel,
} from "@/lib/enterprise-lender-workspace/hierarchy";
import type { ElwHierarchyRank } from "@/types/enterprise-lender-workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * Quick Contact from vacant hierarchy — designation + reporting manager prefilled.
 */
export function ElwQuickContactPanel({
  open,
  onOpenChange,
  lenderId,
  rank,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lenderId: string;
  rank: ElwHierarchyRank | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");

  const designation =
    rank != null ? ELW_HIERARCHY_RANKS.find((r) => r.rank === rank)?.label ?? rank : "";
  const reportingManager =
    rank != null ? getReportingManagerLabel(lenderId, rank) : "—";

  useEffect(() => {
    if (!open) return;
    setName("");
    setPhone("");
    setEmail("");
    setState("");
    setCity("");
  }, [open, rank]);

  const onSave = () => {
    if (!rank) return;
    if (!name.trim() || !phone.trim() || !email.trim()) {
      toast.message("Name, phone, and email are required.");
      return;
    }
    assignElwHierarchyContact(lenderId, rank, { name, phone, email, state, city });
    toast.success(`${designation} assigned`);
    onSaved();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        allowOutsideClose={false}
        className="z-[90] flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="space-y-1 border-b border-border/60 px-5 py-4 text-left">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
            Quick Contact
          </p>
          <SheetTitle className="text-base">Assign · {designation}</SheetTitle>
          <SheetDescription className="text-xs">
            Designation and reporting manager are prefilled. Enter only the essentials.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-xs">
            <p>
              <span className="text-muted-foreground">Designation · </span>
              {designation}
            </p>
            <p className="mt-1">
              <span className="text-muted-foreground">Reporting Manager · </span>
              {reportingManager}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Name</Label>
            <Input className="h-9" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Phone</Label>
            <Input className="h-9" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input
              className="h-9"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">State</Label>
              <Input className="h-9" value={state} onChange={(e) => setState(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">City</Label>
              <Input className="h-9" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-border/60 px-5 py-3">
          <Button type="button" className="h-9 w-full bg-teal-700 hover:bg-teal-800" onClick={onSave}>
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
