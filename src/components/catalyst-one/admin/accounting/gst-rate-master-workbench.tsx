"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { accountingGstRateApiClient } from "@/lib/enterprise-accounting-gst-rate/client";
import type { EnterpriseAccountingGstRateDto } from "@/types/enterprise-accounting-gst-rate";

export function AccountingGstRateMasterWorkbench() {
  const [rows, setRows] = useState<EnterpriseAccountingGstRateDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    ratePercent: "",
    enabled: true,
    effectiveFrom: "",
    effectiveUntil: "",
  });

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await accountingGstRateApiClient.list());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load GST Rate Master");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", ratePercent: "", enabled: true, effectiveFrom: "", effectiveUntil: "" });
    setOpen(true);
  };

  const openEdit = (row: EnterpriseAccountingGstRateDto) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      ratePercent: String(row.ratePercent),
      enabled: row.enabled,
      effectiveFrom: row.effectiveFrom ? row.effectiveFrom.slice(0, 10) : "",
      effectiveUntil: row.effectiveUntil ? row.effectiveUntil.slice(0, 10) : "",
    });
    setOpen(true);
  };

  const payload = () => ({
    name: form.name.trim(),
    ratePercent: Number(form.ratePercent),
    enabled: form.enabled,
    effectiveFrom: form.effectiveFrom || null,
    effectiveUntil: form.effectiveUntil || null,
  });

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("GST rate name is required");
      return;
    }
    if (form.ratePercent === "" || Number.isNaN(Number(form.ratePercent)) || Number(form.ratePercent) < 0) {
      toast.error("Enter a GST rate percent (0 is allowed)");
      return;
    }
    try {
      if (editingId) {
        await accountingGstRateApiClient.update(editingId, payload());
        toast.success("GST rate updated");
      } else {
        await accountingGstRateApiClient.create(payload());
        toast.success("GST rate created");
      }
      setOpen(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save GST rate");
    }
  };

  const toggleEnabled = async (row: EnterpriseAccountingGstRateDto) => {
    setBusyId(row.id);
    try {
      await accountingGstRateApiClient.update(row.id, { enabled: !row.enabled });
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update GST rate");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Accounting GST Rate Master</h2>
          <p className="text-[11px] text-muted-foreground">
            Approved rates for Raise Invoice. 0% is allowed. Rates are never inferred from GSTIN.
          </p>
        </div>
        <Button type="button" size="sm" className="h-8 text-xs" onClick={openCreate}>
          Add GST rate
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="px-2 py-2">Name</th>
              <th className="px-2 py-2">Rate %</th>
              <th className="px-2 py-2">Effective</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-2 py-6 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-2 py-6 text-center text-muted-foreground">
                  No GST rates yet. Add an approved rate before Raise Invoice.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-2 py-2 font-medium">{row.name}</td>
                  <td className="px-2 py-2 tabular-nums">{row.ratePercent}%</td>
                  <td className="px-2 py-2 text-muted-foreground">
                    {(row.effectiveFrom ? row.effectiveFrom.slice(0, 10) : "—") +
                      " → " +
                      (row.effectiveUntil ? row.effectiveUntil.slice(0, 10) : "—")}
                  </td>
                  <td className="px-2 py-2">{row.enabled ? "Active" : "Inactive"}</td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        onClick={() => openEdit(row)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        disabled={busyId === row.id}
                        onClick={() => void toggleEnabled(row)}
                      >
                        {row.enabled ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit GST rate" : "Add GST rate"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Name</Label>
              <Input
                className="mt-1 h-8 text-xs"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Rate percent (0 allowed)</Label>
              <Input
                className="mt-1 h-8 text-xs"
                inputMode="decimal"
                value={form.ratePercent}
                onChange={(e) => setForm((f) => ({ ...f, ratePercent: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Effective from</Label>
                <Input
                  type="date"
                  className="mt-1 h-8 text-xs"
                  value={form.effectiveFrom}
                  onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Effective until</Label>
                <Input
                  type="date"
                  className="mt-1 h-8 text-xs"
                  value={form.effectiveUntil}
                  onChange={(e) => setForm((f) => ({ ...f, effectiveUntil: e.target.value }))}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
              />
              Active
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={() => void submit()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
