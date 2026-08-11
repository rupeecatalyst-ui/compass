"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, Loader2, PenLine, Plus } from "lucide-react";
import { toast } from "sonner";
import { organizationWorkspaceApi } from "@/lib/enterprise-organization-workspace";
import { ORG_DOCUMENTS_PERSISTENCE_REQUIRED_MESSAGE } from "@/lib/organization-documents";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DigitalSignature, DigitalSignatureStatus } from "@/types/organization";

const statusVariant: Record<DigitalSignatureStatus, "success" | "warning" | "error"> = {
  active: "success",
  expiring: "warning",
  expired: "error",
};

const statusLabel: Record<DigitalSignatureStatus, string> = {
  active: "Active",
  expiring: "Expiring Soon",
  expired: "Expired",
};

function normalizeStatus(status: string): DigitalSignatureStatus {
  if (status === "expiring" || status === "expired") return status;
  return "active";
}

const emptyForm = {
  person: "",
  designation: "",
  status: "active" as DigitalSignatureStatus,
  expiry: "",
  initials: "",
};

export function DigitalSignaturesGrid() {
  const [signatures, setSignatures] = useState<DigitalSignature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await organizationWorkspaceApi.listDigitalSignatures();
      setSignatures(
        rows
          .filter((s) => !s.isDeleted)
          .map((s) => ({
            id: s.id,
            person: s.person,
            designation: s.designation,
            status: normalizeStatus(s.status),
            expiry: s.expiry,
            initials: s.initials,
          })),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : ORG_DOCUMENTS_PERSISTENCE_REQUIRED_MESSAGE;
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    if (!form.person.trim() || !form.designation.trim()) {
      toast.error("Person and designation are required.");
      return;
    }
    setSaving(true);
    try {
      const initials =
        form.initials.trim() ||
        form.person
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((p) => p[0]?.toUpperCase() ?? "")
          .join("");
      await organizationWorkspaceApi.createDigitalSignature({
        person: form.person.trim(),
        designation: form.designation.trim(),
        status: form.status,
        expiry: form.expiry.trim(),
        initials,
      });
      toast.success("Digital signature registered.");
      setOpen(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save signature");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading digital signatures…
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Signature
        </Button>
      </div>

      {signatures.length === 0 ? (
        <p className="rounded-lg border border-border/60 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          No digital signatures registered yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {signatures.map((signature) => (
            <Card key={signature.id} className="glass-card border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{signature.person}</CardTitle>
                    <p className="text-sm text-muted-foreground">{signature.designation}</p>
                  </div>
                  <StatusPill variant={statusVariant[signature.status]}>
                    {statusLabel[signature.status]}
                  </StatusPill>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20">
                  <div className="text-center">
                    <p className="font-serif text-2xl italic text-foreground/80">
                      {signature.initials}
                    </p>
                    <PenLine className="mx-auto mt-1 h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
                {signature.expiry && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Expiry:{" "}
                      {new Date(signature.expiry).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Digital Signature</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Person</Label>
              <Input
                value={form.person}
                onChange={(e) => setForm((f) => ({ ...f, person: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Designation</Label>
              <Input
                value={form.designation}
                onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Initials</Label>
              <Input
                value={form.initials}
                onChange={(e) => setForm((f) => ({ ...f, initials: e.target.value }))}
                placeholder="Auto from name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, status: v as DigitalSignatureStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expiring">Expiring Soon</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Expiry (YYYY-MM-DD)</Label>
              <Input
                value={form.expiry}
                onChange={(e) => setForm((f) => ({ ...f, expiry: e.target.value }))}
                placeholder="2027-12-31"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleCreate()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
