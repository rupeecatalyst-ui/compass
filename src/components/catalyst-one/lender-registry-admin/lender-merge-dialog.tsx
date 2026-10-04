"use client";

import { useState } from "react";
import { toast } from "sonner";
import { authenticatedJsonFetch } from "@/lib/api-client";
import type { EnterpriseLenderRecord } from "@/types/enterprise-lender-registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Preview = {
  source: { id: string; code: string; label: string; counts: Record<string, number> };
  target: { id: string; code: string; label: string; counts: Record<string, number> };
  conflicts: Array<{ kind: string; count: number; message: string }>;
};

export function LenderMergeDialog({
  open,
  onOpenChange,
  lenders,
  onMerged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lenders: EnterpriseLenderRecord[];
  onMerged: () => void;
}) {
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);

  async function request(execute: boolean) {
    setBusy(true);
    try {
      const response = await authenticatedJsonFetch("/api/lender-registry/lenders/merge", {
        method: "POST",
        body: JSON.stringify({ sourceLenderId: sourceId, targetLenderId: targetId, execute, reason }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) throw new Error(body?.error?.message || "Lender merge request failed.");
      if (!execute) {
        setPreview(body.data as Preview);
      } else {
        toast.success("Duplicate lender consolidated and retired.");
        onOpenChange(false);
        onMerged();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lender merge request failed.");
    } finally {
      setBusy(false);
    }
  }

  const canExecute = preview && preview.conflicts.length === 0 && reason.trim().length > 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Merge duplicate lender</DialogTitle>
          <DialogDescription>Preview durable dependencies before consolidating. No name-based automatic merge is performed.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><p className="mb-1 text-xs font-medium">Duplicate / source</p><Select value={sourceId} onValueChange={(v) => { setSourceId(v); setPreview(null); }}><SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger><SelectContent>{lenders.map((l) => <SelectItem key={l.id} value={l.id}>{l.label} · {l.code}</SelectItem>)}</SelectContent></Select></div>
          <div><p className="mb-1 text-xs font-medium">Canonical / target</p><Select value={targetId} onValueChange={(v) => { setTargetId(v); setPreview(null); }}><SelectTrigger><SelectValue placeholder="Select target" /></SelectTrigger><SelectContent>{lenders.map((l) => <SelectItem key={l.id} value={l.id}>{l.label} · {l.code}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <Button type="button" variant="outline" disabled={busy || !sourceId || !targetId || sourceId === targetId} onClick={() => void request(false)}>Preview impact</Button>
        {preview ? <div className="space-y-2 rounded-lg border p-3 text-xs">
          <p className="font-semibold">{preview.source.label} → {preview.target.label}</p>
          <div className="grid gap-1 sm:grid-cols-2">{Object.entries(preview.source.counts).map(([key, count]) => <p key={key}>{key}: <strong>{count}</strong></p>)}</div>
          {preview.conflicts.length ? <div className="rounded border border-destructive/40 bg-destructive/5 p-2 text-destructive">{preview.conflicts.map((c) => <p key={c.kind}>{c.message} ({c.count})</p>)}</div> : <p className="text-emerald-700">No blocking collisions detected.</p>}
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Required merge reason" />
          <Button type="button" disabled={busy || !canExecute} onClick={() => void request(true)}>Merge into canonical lender</Button>
        </div> : null}
      </DialogContent>
    </Dialog>
  );
}
