"use client";

/**
 * CO-ARCH-003 Phase 2B Sprint 1 — Accounting → Invoice Party Master workbench.
 * Maintains Accounting Invoice Party Master; links Contact/Company without duplicating registry data.
 */

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LiveEntityMasterSearch } from "@/components/catalyst-one/shared/live-entity-master-search";
import { INVOICE_PARTY_TYPE_OPTIONS } from "@/constants/invoice-party";
import {
  invoicePartyApiClient,
  type InvoicePartyRecord,
} from "@/lib/invoice-party/invoice-party-api-client";

export function InvoicePartyMasterWorkbench() {
  const [rows, setRows] = useState<InvoicePartyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    partyType: "lender",
    legalName: "",
    billingName: "",
    displayName: "",
    contactId: "" as string,
    contactLabel: "",
    companyId: "" as string,
    companyLabel: "",
    gstin: "",
    pan: "",
    billingAddress: "",
    stateLabel: "",
    invoiceEmail: "",
    tdsApplicable: false,
    tdsRatePercent: "",
    gstStatus: "unknown",
  });

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const items = await invoicePartyApiClient.list();
      setRows(items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load Invoice Party Master");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const submit = async () => {
    if (!form.contactId && !form.companyId) {
      toast.error("Select a Contact or Company from the Enterprise Registry");
      return;
    }
    if (!form.legalName.trim()) {
      toast.error("Legal Name is required");
      return;
    }
    try {
      await invoicePartyApiClient.create({
        partyType: form.partyType,
        legalName: form.legalName.trim(),
        billingName: (form.billingName || form.legalName).trim(),
        displayName: (form.displayName || form.billingName || form.legalName).trim(),
        contactId: form.contactId || null,
        companyId: form.companyId || null,
        gstin: form.gstin || null,
        pan: form.pan || null,
        billingAddress: form.billingAddress || null,
        stateLabel: form.stateLabel || null,
        invoiceEmail: form.invoiceEmail || null,
        tdsApplicable: form.tdsApplicable,
        tdsRatePercent: form.tdsRatePercent ? Number(form.tdsRatePercent) : null,
        gstStatus: form.gstStatus || null,
      });
      toast.success("Invoice Party created in Accounting Invoice Party Master");
      setOpen(false);
      void reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create Invoice Party");
    }
  };

  return (
    <div className="space-y-3 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Invoice Party Master</h2>
          <p className="text-[11px] text-muted-foreground">
            Accounting-approved Invoice Parties. Linked to Contact / Company Registry — no
            duplicate party data.
          </p>
        </div>
        <Button type="button" size="sm" className="h-8 gap-1 text-xs" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add Invoice Party
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="px-2 py-2">Display Name</th>
              <th className="px-2 py-2">Type</th>
              <th className="px-2 py-2">Linked Registry</th>
              <th className="px-2 py-2">GSTIN</th>
              <th className="px-2 py-2">Invoice Email</th>
              <th className="px-2 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-2 py-6 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-2 py-6 text-center text-muted-foreground">
                  No invoice parties yet. Add an Invoice Party from Contact or Company Registry.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="px-2 py-2 font-medium">{r.displayName}</td>
                  <td className="px-2 py-2 capitalize">{r.partyType.replace(/_/g, " ")}</td>
                  <td className="px-2 py-2 text-muted-foreground">
                    {r.contact?.name
                      ? `Contact · ${r.contact.name}`
                      : r.company?.companyName
                        ? `Company · ${r.company.companyName}`
                        : "—"}
                  </td>
                  <td className="px-2 py-2">{r.gstin || "—"}</td>
                  <td className="px-2 py-2">{r.invoiceEmail || "—"}</td>
                  <td className="px-2 py-2">{r.enabled ? "Active" : "Inactive"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Invoice Party</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">
                Search Contact (Enterprise Contact Registry)
              </Label>
              <div className="mt-1">
                <LiveEntityMasterSearch
                  kind="contact"
                  placeholder="Search Contact…"
                  selectedId={form.contactId || undefined}
                  selectedLabel={form.contactLabel || undefined}
                  onSelect={(hit) =>
                    setForm((f) => ({
                      ...f,
                      contactId: hit.id,
                      contactLabel: hit.label,
                      legalName: f.legalName || hit.label,
                      billingName: f.billingName || hit.label,
                      displayName: f.displayName || hit.label,
                    }))
                  }
                />
              </div>
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">
                Or search Company
              </Label>
              <div className="mt-1">
                <LiveEntityMasterSearch
                  kind="company"
                  placeholder="Search Company…"
                  selectedId={form.companyId || undefined}
                  selectedLabel={form.companyLabel || undefined}
                  onSelect={(hit) =>
                    setForm((f) => ({
                      ...f,
                      companyId: hit.id,
                      companyLabel: hit.label,
                      legalName: f.legalName || hit.label,
                      billingName: f.billingName || hit.label,
                      displayName: f.displayName || hit.label,
                    }))
                  }
                />
              </div>
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Payee Type</Label>
              <Select
                value={form.partyType}
                onValueChange={(v) => setForm((f) => ({ ...f, partyType: v }))}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVOICE_PARTY_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.id} value={o.id} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="intermediary" className="text-xs">
                    Intermediary / Channel
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(
              [
                ["legalName", "Legal Name *"],
                ["billingName", "Billing Name"],
                ["displayName", "Display Name"],
                ["gstin", "GSTIN"],
                ["pan", "PAN"],
                ["stateLabel", "State"],
                ["invoiceEmail", "Invoice Email"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
                <Input
                  className="mt-1 h-8 text-xs"
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Billing Address</Label>
              <Input
                className="mt-1 h-8 text-xs"
                value={form.billingAddress}
                onChange={(e) => setForm((f) => ({ ...f, billingAddress: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">GST Status</Label>
                <Select
                  value={form.gstStatus}
                  onValueChange={(v) => setForm((f) => ({ ...f, gstStatus: v }))}
                >
                  <SelectTrigger className="mt-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="registered" className="text-xs">
                      Registered
                    </SelectItem>
                    <SelectItem value="unregistered" className="text-xs">
                      Unregistered
                    </SelectItem>
                    <SelectItem value="composition" className="text-xs">
                      Composition
                    </SelectItem>
                    <SelectItem value="unknown" className="text-xs">
                      Unknown
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">TDS Rate %</Label>
                <Input
                  className="mt-1 h-8 text-xs"
                  value={form.tdsRatePercent}
                  onChange={(e) => setForm((f) => ({ ...f, tdsRatePercent: e.target.value }))}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={form.tdsApplicable}
                onChange={(e) => setForm((f) => ({ ...f, tdsApplicable: e.target.checked }))}
              />
              TDS Applicable
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={() => void submit()}>
              Save Invoice Party
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
