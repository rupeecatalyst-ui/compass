"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Landmark, Loader2, Plus, Star, XCircle } from "lucide-react";
import { toast } from "sonner";
import { organizationWorkspaceApi } from "@/lib/enterprise-organization-workspace";
import { ORG_DOCUMENTS_PERSISTENCE_REQUIRED_MESSAGE } from "@/lib/organization-documents";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { BankAccount } from "@/types/organization";

const emptyForm = {
  bank: "",
  branch: "",
  accountNumber: "",
  ifsc: "",
  isCurrentAccount: true,
  cancelledChequeAvailable: false,
  isPrimary: false,
};

export function BankAccountsGrid() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await organizationWorkspaceApi.listBankAccounts();
      setAccounts(
        rows
          .filter((a) => !a.isDeleted)
          .map((a) => ({
            id: a.id,
            bank: a.bank,
            branch: a.branch,
            accountNumber: a.accountNumber,
            ifsc: a.ifsc,
            isCurrentAccount: a.isCurrentAccount,
            cancelledChequeAvailable: a.cancelledChequeAvailable,
            isPrimary: a.isPrimary,
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
    if (!form.bank.trim() || !form.accountNumber.trim() || !form.ifsc.trim()) {
      toast.error("Bank, account number, and IFSC are required.");
      return;
    }
    setSaving(true);
    try {
      await organizationWorkspaceApi.createBankAccount({
        bank: form.bank.trim(),
        branch: form.branch.trim(),
        accountNumber: form.accountNumber.trim(),
        ifsc: form.ifsc.trim().toUpperCase(),
        isCurrentAccount: form.isCurrentAccount,
        cancelledChequeAvailable: form.cancelledChequeAvailable,
        isPrimary: form.isPrimary,
      });
      toast.success("Bank account saved.");
      setOpen(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save bank account");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading bank accounts…
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
          Add Bank Account
        </Button>
      </div>

      {accounts.length === 0 ? (
        <p className="rounded-lg border border-border/60 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          No bank accounts registered yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <Card
              key={account.id}
              className={cn(
                "glass-card border-border/60 overflow-hidden",
                account.isPrimary && "ring-1 ring-primary/30",
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 border border-primary/20">
                      <Landmark className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{account.bank}</CardTitle>
                      <p className="text-xs text-muted-foreground">{account.branch}</p>
                    </div>
                  </div>
                  {account.isPrimary && (
                    <StatusPill variant="default" className="shrink-0">
                      <Star className="h-3 w-3" />
                      Primary
                    </StatusPill>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailRow label="Account Number" value={account.accountNumber} mono />
                <DetailRow label="IFSC" value={account.ifsc} mono />
                <div className="flex flex-wrap gap-2 pt-1">
                  <StatusPill variant={account.isCurrentAccount ? "info" : "muted"}>
                    {account.isCurrentAccount ? "Current Account" : "Other Account"}
                  </StatusPill>
                  <StatusPill variant={account.cancelledChequeAvailable ? "success" : "warning"}>
                    {account.cancelledChequeAvailable ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        Cheque Available
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3" />
                        No Cheque
                      </>
                    )}
                  </StatusPill>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bank Account</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Bank</Label>
              <Input
                value={form.bank}
                onChange={(e) => setForm((f) => ({ ...f, bank: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Branch</Label>
              <Input
                value={form.branch}
                onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Account Number</Label>
              <Input
                value={form.accountNumber}
                onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>IFSC</Label>
              <Input
                value={form.ifsc}
                onChange={(e) => setForm((f) => ({ ...f, ifsc: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.isCurrentAccount}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, isCurrentAccount: v === true }))
                }
              />
              Current account
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.cancelledChequeAvailable}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, cancelledChequeAvailable: v === true }))
                }
              />
              Cancelled cheque available
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Checkbox
                checked={form.isPrimary}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isPrimary: v === true }))}
              />
              Primary account
            </label>
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

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", mono && "font-mono text-xs")}>{value}</span>
    </div>
  );
}
