"use client";

/**
 * CO-WP-ACCESS-001 — Administration → Wealth Partner Access & Entitlements
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Save, Shield } from "lucide-react";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { authenticatedJsonFetch } from "@/lib/api-client";
import {
  PARTNER_ENTITLEMENT_ACTION_LABELS,
  PARTNER_ENTITLEMENT_ACTIONS,
  PARTNER_EXECUTION_MODE_LABELS,
  PARTNER_EXECUTION_MODES,
  type PartnerEntitlementAction,
  type PartnerExecutionMode,
  type PartnerPermissionMap,
} from "@/constants/enterprise-partner-entitlements";
import type {
  PartnerEffectiveEntitlements,
  PartnerEntitlementAuditEntry,
  PartnerEntitlementProfileDto,
  PartnerEntitlementTemplateDto,
  PartnerTransactionEntitlementDto,
} from "@/types/enterprise-partner-entitlements";
import { toast } from "sonner";

type ApiEnvelope<T> = { success: boolean; data?: T; error?: { message?: string } };

type PartnerRow = {
  id: string;
  code: string;
  displayName: string;
  partnerType: string;
  lifecycleStatus: string;
  operationalStatus: string;
  profile: PartnerEntitlementProfileDto | null;
};

function emptyPerms(all = false): PartnerPermissionMap {
  return {
    view: all,
    create: all,
    edit: all,
    stage_change: all,
    document_upload: all,
    document_edit: all,
    activity_add: all,
  };
}

export function PartnerEntitlementsAdminPanel() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [templates, setTemplates] = useState<PartnerEntitlementTemplateDto[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [profile, setProfile] = useState<PartnerEntitlementProfileDto | null>(null);
  const [effective, setEffective] = useState<PartnerEffectiveEntitlements | null>(null);
  const [overrides, setOverrides] = useState<PartnerTransactionEntitlementDto[]>([]);
  const [audits, setAudits] = useState<PartnerEntitlementAuditEntry[]>([]);
  const [permissions, setPermissions] = useState<PartnerPermissionMap>(emptyPerms());
  const [mode, setMode] = useState<PartnerExecutionMode>("referral");
  const [templateId, setTemplateId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [txnEntityId, setTxnEntityId] = useState("");
  const [txnMode, setTxnMode] = useState<PartnerExecutionMode>("joint_execution");
  const [txnPermissions, setTxnPermissions] = useState<PartnerPermissionMap>(emptyPerms(false));

  const selectedPartner = useMemo(
    () => partners.find((p) => p.id === selectedPartnerId) ?? null,
    [partners, selectedPartnerId],
  );

  const loadHub = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/partner-entitlements?view=partners");
      const body = (await res.json()) as ApiEnvelope<{
        partners: PartnerRow[];
        templates: PartnerEntitlementTemplateDto[];
      }>;
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error?.message || "Failed to load partners");
      }
      setPartners(body.data.partners);
      setTemplates(body.data.templates);
      if (!selectedPartnerId && body.data.partners[0]) {
        setSelectedPartnerId(body.data.partners[0].id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [selectedPartnerId]);

  const loadPartnerDetail = useCallback(async (wealthPartnerId: string) => {
    if (!wealthPartnerId) return;
    setBusy(true);
    try {
      const [effRes, auditRes] = await Promise.all([
        authenticatedJsonFetch(
          `/api/admin/partner-entitlements?view=effective&wealthPartnerId=${encodeURIComponent(wealthPartnerId)}`,
        ),
        authenticatedJsonFetch(
          `/api/admin/partner-entitlements?view=audits&wealthPartnerId=${encodeURIComponent(wealthPartnerId)}&limit=30`,
        ),
      ]);
      const effBody = (await effRes.json()) as ApiEnvelope<{
        effective: PartnerEffectiveEntitlements;
        profile: PartnerEntitlementProfileDto;
        overrides: PartnerTransactionEntitlementDto[];
      }>;
      const auditBody = (await auditRes.json()) as ApiEnvelope<{
        audits: PartnerEntitlementAuditEntry[];
      }>;
      if (!effRes.ok || !effBody.success || !effBody.data) {
        throw new Error(effBody.error?.message || "Failed to load entitlements");
      }
      setEffective(effBody.data.effective);
      setProfile(effBody.data.profile);
      setOverrides(effBody.data.overrides);
      setPermissions({ ...effBody.data.profile.permissions });
      setMode(effBody.data.profile.defaultExecutionMode);
      setTemplateId(effBody.data.profile.templateId || "");
      setNotes(effBody.data.profile.notes || "");
      setAudits(auditBody.data?.audits ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load partner detail");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void loadHub();
  }, [loadHub]);

  useEffect(() => {
    if (selectedPartnerId) void loadPartnerDetail(selectedPartnerId);
  }, [selectedPartnerId, loadPartnerDetail]);

  const togglePerm = (key: PartnerEntitlementAction, checked: boolean) => {
    setPermissions((prev) => ({ ...prev, [key]: checked }));
  };

  const toggleTxnPerm = (key: PartnerEntitlementAction, checked: boolean) => {
    setTxnPermissions((prev) => ({ ...prev, [key]: checked }));
  };

  const saveProfile = async (applyTemplateDefaults = false) => {
    if (!selectedPartnerId) return;
    setBusy(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/partner-entitlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_profile",
          wealthPartnerId: selectedPartnerId,
          templateId: templateId || null,
          defaultExecutionMode: mode,
          permissions,
          notes,
          reason: reason || undefined,
          applyTemplateDefaults,
        }),
      });
      const body = (await res.json()) as ApiEnvelope<{ profile: PartnerEntitlementProfileDto }>;
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || "Save failed");
      }
      toast.success("Partner entitlements saved");
      setReason("");
      await loadPartnerDetail(selectedPartnerId);
      await loadHub();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const saveTxnOverride = async () => {
    if (!selectedPartnerId || !txnEntityId.trim()) {
      toast.error("Opportunity / Deal ID is required for a transaction override");
      return;
    }
    setBusy(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/partner-entitlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_transaction_override",
          wealthPartnerId: selectedPartnerId,
          entityKind: "opportunity",
          entityId: txnEntityId.trim(),
          executionMode: txnMode,
          permissions: txnPermissions,
          reason: reason || "Transaction-level override",
        }),
      });
      const body = (await res.json()) as ApiEnvelope<{ override: PartnerTransactionEntitlementDto }>;
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || "Override save failed");
      }
      toast.success("Transaction override saved");
      setReason("");
      await loadPartnerDetail(selectedPartnerId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Override save failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading && partners.length === 0) {
    return <ChanakyaLoadingExperience statusLabel="Loading Partner Access & Entitlements…" />;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-tight text-foreground">
            Wealth Partner Access & Entitlements
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Catalyst One decides what partners can see and do. Partner Gateway enforces. Wealth
            Partner App presents. Notepad / Activity is independent of Edit.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadHub()} disabled={busy}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Select Wealth Partner
          </CardTitle>
          <CardDescription>
            Configure partner defaults, templates, and transaction overrides.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Wealth Partner</Label>
              <Select value={selectedPartnerId} onValueChange={setSelectedPartnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select partner" />
                </SelectTrigger>
                <SelectContent>
                  {partners.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.displayName} ({p.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Entitlement template</Label>
              <Select value={templateId || "none"} onValueChange={(v) => setTemplateId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template linked</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label} · {PARTNER_EXECUTION_MODE_LABELS[t.executionMode]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedPartner ? (
            <p className="text-xs text-muted-foreground">
              {selectedPartner.partnerType} · Lifecycle {selectedPartner.lifecycleStatus} ·{" "}
              {selectedPartner.operationalStatus}
              {profile?.templateCode ? ` · Template ${profile.templateCode}` : ""}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Partner capabilities</CardTitle>
            <CardDescription>
              Default rights for this partner. Referral defaults to View + Activity only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default execution mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as PartnerExecutionMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PARTNER_EXECUTION_MODES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {PARTNER_EXECUTION_MODE_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              {PARTNER_ENTITLEMENT_ACTIONS.map((action) => (
                <label key={action} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={Boolean(permissions[action])}
                    onCheckedChange={(c) => togglePerm(action, c === true)}
                  />
                  <span>{PARTNER_ENTITLEMENT_ACTION_LABELS[action]}</span>
                </label>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Change reason (audit)</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this changing?"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void saveProfile(false)} disabled={busy || !selectedPartnerId}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save partner defaults
              </Button>
              <Button
                variant="secondary"
                onClick={() => void saveProfile(true)}
                disabled={busy || !selectedPartnerId || !templateId}
              >
                Apply template defaults
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Effective rights</CardTitle>
            <CardDescription>
              Resolved runtime permissions (template → partner → transaction override).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {effective ? (
              <>
                <p className="text-sm">
                  Mode: <strong>{PARTNER_EXECUTION_MODE_LABELS[effective.executionMode]}</strong>
                  {" · "}
                  Source: <strong>{effective.source.replace(/_/g, " ")}</strong>
                </p>
                <ul className="space-y-1 text-sm">
                  {PARTNER_ENTITLEMENT_ACTIONS.map((action) => (
                    <li key={action} className="flex justify-between border-b border-border/40 py-1">
                      <span>{PARTNER_ENTITLEMENT_ACTION_LABELS[action]}</span>
                      <span
                        className={
                          effective.permissions[action]
                            ? "font-medium text-emerald-700"
                            : "text-muted-foreground"
                        }
                      >
                        {effective.permissions[action] ? "Allowed" : "Not allowed"}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select a partner to view effective rights.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Transaction-level override</CardTitle>
          <CardDescription>
            Override rights for a specific Opportunity without a separate partner database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Opportunity ID</Label>
              <Input
                value={txnEntityId}
                onChange={(e) => setTxnEntityId(e.target.value)}
                placeholder="Enterprise Opportunity id"
              />
            </div>
            <div className="space-y-2">
              <Label>Execution mode for this transaction</Label>
              <Select value={txnMode} onValueChange={(v) => setTxnMode(v as PartnerExecutionMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PARTNER_EXECUTION_MODES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {PARTNER_EXECUTION_MODE_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {PARTNER_ENTITLEMENT_ACTIONS.map((action) => (
              <label key={action} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={Boolean(txnPermissions[action])}
                  onCheckedChange={(c) => toggleTxnPerm(action, c === true)}
                />
                <span>{PARTNER_ENTITLEMENT_ACTION_LABELS[action]}</span>
              </label>
            ))}
          </div>
          <Button onClick={() => void saveTxnOverride()} disabled={busy || !selectedPartnerId}>
            Save transaction override
          </Button>

          {overrides.length > 0 ? (
            <div className="space-y-2 pt-2">
              <p className="text-sm font-medium">Existing overrides</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {overrides.map((o) => (
                  <li key={o.id}>
                    {o.entityKind}:{o.entityId} · {PARTNER_EXECUTION_MODE_LABELS[o.executionMode]} ·
                    edit={String(o.permissions.edit)} stage={String(o.permissions.stage_change)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Audit history</CardTitle>
          <CardDescription>Who changed what, previous vs new values, timestamp.</CardDescription>
        </CardHeader>
        <CardContent>
          {audits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entitlement changes recorded yet.</p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
              {audits.map((a) => (
                <li key={a.id} className="rounded-md border border-border/50 p-2">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-medium">{a.changeType.replace(/_/g, " ")}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(a.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Actor {a.actorUserId}
                    {a.reason ? ` · ${a.reason}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
