"use client";

/**
 * CO-WP-001 â€” Wealth Partner Workspace (10 tabs).
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveEntityMasterSearch } from "@/components/catalyst-one/shared/live-entity-master-search";
import { WealthPartnerNetworkIntelligence } from "@/components/catalyst-one/wealth-partner-registry/wealth-partner-network-intelligence";
import { WealthPartnerLegalCompliancePanel } from "@/components/catalyst-one/wealth-partner-registry/wealth-partner-legal-compliance-panel";
import { WealthPartnerActivationPanel } from "@/components/catalyst-one/enterprise-invitation-engine/wealth-partner-activation-panel";
import {
  WEALTH_PARTNER_NETWORK_RELATIONSHIP_TYPES,
  WEALTH_PARTNER_TYPE_OPTIONS,
  WEALTH_PARTNER_WORKSPACE_TABS,
  wealthPartnerTypeLabel,
  type WealthPartnerWorkspaceTabId,
} from "@/constants/enterprise-wealth-partner-registry";
import { ROUTES } from "@/constants/routes";
import { wealthPartnerApiClient } from "@/lib/enterprise-wealth-partner-registry";
import type {
  WealthPartnerIdentityKind,
  WealthPartnerWorkspaceBundle,
} from "@/types/enterprise-wealth-partner-registry";
import { cn } from "@/lib/utils";

function formatInr(n: number): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return String(n);
  }
}

interface WealthPartnerWorkspaceProps {
  partnerId: string;
}

export function WealthPartnerWorkspace({ partnerId }: WealthPartnerWorkspaceProps) {
  const [tab, setTab] = useState<WealthPartnerWorkspaceTabId>("overview");
  const [bundle, setBundle] = useState<WealthPartnerWorkspaceBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await wealthPartnerApiClient.getWorkspace(partnerId);
      setBundle(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load workspace");
      setBundle(null);
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading && !bundle) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Opening Wealth Partner Workspaceâ€¦
      </div>
    );
  }

  if (!bundle) {
    return (
      <div className="space-y-3 py-10 text-center">
        <p className="text-sm text-muted-foreground">Wealth Partner not found.</p>
        <Button asChild variant="outline" size="sm">
          <Link href={ROUTES.WEALTH_PARTNERS}>Back to Registry</Link>
        </Button>
      </div>
    );
  }

  const { partner, businessSourcing } = bundle;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={ROUTES.WEALTH_PARTNERS}
            className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            Wealth Partner Registry
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {partner.displayName}
          </h1>
          <p className="text-xs text-muted-foreground">
            {partner.code} Â· {wealthPartnerTypeLabel(partner.partnerType)} Â·{" "}
            {partner.identityKind === "contact" ? "Contact" : "Company"} identity
            {partner.identityLabel ? ` Â· ${partner.identityLabel}` : ""}
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => void refresh()}>
          Refresh
        </Button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {WEALTH_PARTNER_WORKSPACE_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-xs font-medium transition-colors",
              tab === t.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi title="Opportunities" value={String(businessSourcing.totalOpportunitiesGenerated)} />
          <Kpi title="Deals" value={String(businessSourcing.totalDealsGenerated)} />
          <Kpi title="Disbursement" value={formatInr(businessSourcing.totalDisbursement)} />
          <Kpi title="Conversion" value={`${businessSourcing.conversionRatio}%`} />
          <WealthPartnerActivationPanel
            partnerId={partnerId}
            partnerEmail={partner.email}
          />
          <Card className="sm:col-span-2 lg:col-span-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Partner snapshot</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
              <Row label="Mobile" value={partner.mobile ?? "â€”"} />
              <Row label="Email" value={partner.email ?? "â€”"} />
              <Row label="City" value={partner.cityLabel ?? "â€”"} />
              <Row label="Lifecycle" value={partner.lifecycleStatus} />
              <Row label="Network members" value={String(bundle.network.length)} />
              <Row label="Commission plans" value={String(bundle.commissions.length)} />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "profile" ? (
        <ProfileTab
          partnerId={partnerId}
          partner={partner}
          saving={saving}
          setSaving={setSaving}
          onSaved={refresh}
        />
      ) : null}

      {tab === "documents" ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{bundle.documents.note}</p>
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Document</th>
                  <th className="px-3 py-2 text-left">Category</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {bundle.documents.items.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                      No referenced documents for this identity yet.
                    </td>
                  </tr>
                ) : (
                  bundle.documents.items.map((d) => (
                    <tr key={d.id} className="border-b">
                      <td className="px-3 py-2">{d.displayName}</td>
                      <td className="px-3 py-2 text-muted-foreground">{d.categoryLabel}</td>
                      <td className="px-3 py-2 capitalize">{d.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "commission" ? (
        <CommissionTab partnerId={partnerId} bundle={bundle} onChanged={refresh} />
      ) : null}

      {tab === "banking" ? (
        <BankingTab partnerId={partnerId} bundle={bundle} onChanged={refresh} />
      ) : null}

      {tab === "performance" || tab === "business-sourcing" ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi title="Opportunities Generated" value={String(businessSourcing.totalOpportunitiesGenerated)} />
            <Kpi title="Deals Generated" value={String(businessSourcing.totalDealsGenerated)} />
            <Kpi title="Total Disbursement" value={formatInr(businessSourcing.totalDisbursement)} />
            <Kpi title="Revenue Generated" value={formatInr(businessSourcing.revenueGenerated)} />
            <Kpi title="Conversion Ratio" value={`${businessSourcing.conversionRatio}%`} />
            <Kpi title="Active Cases" value={String(businessSourcing.activeCases)} />
            <Kpi title="Won Cases" value={String(businessSourcing.wonCases)} />
            <Kpi title="Lost Cases" value={String(businessSourcing.lostCases)} />
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Monthly Business Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {businessSourcing.monthlyBusinessTrend.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sourced business in the last 12 months.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr>
                      <th className="py-1 text-left">Month</th>
                      <th className="py-1 text-right">Opportunities</th>
                      <th className="py-1 text-right">Deals</th>
                      <th className="py-1 text-right">Disbursement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {businessSourcing.monthlyBusinessTrend.map((m) => (
                      <tr key={m.month} className="border-t">
                        <td className="py-1.5">{m.month}</td>
                        <td className="py-1.5 text-right">{m.opportunities}</td>
                        <td className="py-1.5 text-right">{m.deals}</td>
                        <td className="py-1.5 text-right">{formatInr(m.disbursement)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="mt-3 text-[11px] text-muted-foreground">{businessSourcing.definition}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "network" ? (
        <NetworkTab partnerId={partnerId} bundle={bundle} onChanged={refresh} />
      ) : null}

      {tab === "compliance" ? (
        <WealthPartnerLegalCompliancePanel
          partnerId={partnerId}
          bundle={bundle}
          onChanged={refresh}
        />
      ) : null}

      {tab === "activity" ? (
        <div className="space-y-2">
          {bundle.activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            bundle.activities.map((a) => (
              <div key={a.id} className="rounded-lg border border-border/70 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString("en-GB")}
                  </p>
                </div>
                {a.detail ? <p className="text-xs text-muted-foreground">{a.detail}</p> : null}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-border/40 py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}

function ProfileTab({
  partnerId,
  partner,
  saving,
  setSaving,
  onSaved,
}: {
  partnerId: string;
  partner: WealthPartnerWorkspaceBundle["partner"];
  saving: boolean;
  setSaving: (v: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState(partner.displayName);
  const [partnerType, setPartnerType] = useState(partner.partnerType);
  const [email, setEmail] = useState(partner.email ?? "");
  const [mobile, setMobile] = useState(partner.mobile ?? "");
  const [notes, setNotes] = useState(partner.notes ?? "");

  async function save() {
    setSaving(true);
    try {
      await wealthPartnerApiClient.updatePartner(partnerId, {
        displayName,
        partnerType,
        email: email || null,
        mobile: mobile || null,
        notes: notes || null,
      });
      toast.success("Profile saved.");
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-3">
      <div className="space-y-1.5">
        <Label>Display Name</Label>
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Wealth Partner Type</Label>
        <Select value={partnerType} onValueChange={setPartnerType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WEALTH_PARTNER_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Mobile</Label>
          <Input value={mobile} onChange={(e) => setMobile(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </div>
      <Button type="button" size="sm" disabled={saving} onClick={() => void save()}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Save Profile
      </Button>
    </div>
  );
}

function CommissionTab({
  partnerId,
  bundle,
  onChanged,
}: {
  partnerId: string;
  bundle: WealthPartnerWorkspaceBundle;
  onChanged: () => Promise<void>;
}) {
  const partner = bundle.partner;
  const [referral, setReferral] = useState(
    partner.commercialReferralSharePercent != null
      ? String(partner.commercialReferralSharePercent)
      : "",
  );
  const [sole, setSole] = useState(
    partner.commercialSoleExecutorSharePercent != null
      ? String(partner.commercialSoleExecutorSharePercent)
      : "",
  );
  const [joint, setJoint] = useState(
    partner.commercialJointExecutorSharePercent != null
      ? String(partner.commercialJointExecutorSharePercent)
      : "",
  );
  const [effectiveFrom, setEffectiveFrom] = useState(
    partner.commercialEffectiveFrom
      ? partner.commercialEffectiveFrom.slice(0, 10)
      : "",
  );
  const [status, setStatus] = useState(partner.commercialStatus || "active");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setReferral(
      partner.commercialReferralSharePercent != null
        ? String(partner.commercialReferralSharePercent)
        : "",
    );
    setSole(
      partner.commercialSoleExecutorSharePercent != null
        ? String(partner.commercialSoleExecutorSharePercent)
        : "",
    );
    setJoint(
      partner.commercialJointExecutorSharePercent != null
        ? String(partner.commercialJointExecutorSharePercent)
        : "",
    );
    setEffectiveFrom(
      partner.commercialEffectiveFrom
        ? partner.commercialEffectiveFrom.slice(0, 10)
        : "",
    );
    setStatus(partner.commercialStatus || "active");
  }, [partner]);

  async function save() {
    const parsePct = (raw: string): number | null => {
      if (!raw.trim()) return null;
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > 100) return Number.NaN;
      return n;
    };
    const referralPct = parsePct(referral);
    const solePct = parsePct(sole);
    const jointPct = parsePct(joint);
    if (
      Number.isNaN(referralPct) ||
      Number.isNaN(solePct) ||
      Number.isNaN(jointPct)
    ) {
      toast.error("Revenue share percentages must be between 0 and 100.");
      return;
    }
    setSaving(true);
    try {
      await wealthPartnerApiClient.updatePartner(partnerId, {
        commercialReferralSharePercent: referralPct,
        commercialSoleExecutorSharePercent: solePct,
        commercialJointExecutorSharePercent: jointPct,
        commercialEffectiveFrom: effectiveFrom || null,
        commercialStatus: status,
      });
      toast.success("Commercial Profile saved.");
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
        <h3 className="text-sm font-semibold">Commercial Profile</h3>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Percentage of Rupee Catalyst revenue shared with this Wealth Partner by Participation
          Role. Users never enter commission % on Opportunities â€” values resolve automatically.
        </p>
      </div>
      <div className="grid max-w-2xl gap-3 rounded-xl border p-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Referral Revenue Share %</Label>
          <Input
            inputMode="decimal"
            value={referral}
            onChange={(e) => setReferral(e.target.value)}
            placeholder="e.g. 20"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Sole Executor Revenue Share %</Label>
          <Input
            inputMode="decimal"
            value={sole}
            onChange={(e) => setSole(e.target.value)}
            placeholder="e.g. 40"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Joint Executor Revenue Share %</Label>
          <Input
            inputMode="decimal"
            value={joint}
            onChange={(e) => setJoint(e.target.value)}
            placeholder="e.g. 30"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Effective From</Label>
          <Input
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Button type="button" size="sm" disabled={saving} onClick={() => void save()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save Commercial Profile
          </Button>
        </div>
      </div>
    </div>
  );
}

function BankingTab({
  partnerId,
  bundle,
  onChanged,
}: {
  partnerId: string;
  bundle: WealthPartnerWorkspaceBundle;
  onChanged: () => Promise<void>;
}) {
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [saving, setSaving] = useState(false);

  async function add() {
    setSaving(true);
    try {
      await wealthPartnerApiClient.createBankAccount(partnerId, {
        accountName,
        bankName,
        accountNumber,
        ifsc,
        isPrimary: bundle.bankAccounts.length === 0,
      });
      toast.success("Bank account added.");
      setAccountName("");
      setBankName("");
      setAccountNumber("");
      setIfsc("");
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid max-w-2xl gap-3 rounded-xl border p-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Account Name</Label>
          <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Bank Name</Label>
          <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Account Number</Label>
          <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>IFSC</Label>
          <Input value={ifsc} onChange={(e) => setIfsc(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Button type="button" size="sm" disabled={saving} onClick={() => void add()}>
            Add Bank Account
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        {bundle.bankAccounts.map((b) => (
          <div key={b.id} className="rounded-lg border px-3 py-2 text-sm">
            <p className="font-medium">
              {b.bankName} {b.isPrimary ? "Â· Primary" : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {b.accountName} Â· ****{b.accountNumber.slice(-4)} Â· {b.ifsc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function NetworkTab({
  partnerId,
  bundle,
  onChanged,
}: {
  partnerId: string;
  bundle: WealthPartnerWorkspaceBundle;
  onChanged: () => Promise<void>;
}) {
  const [identityKind, setIdentityKind] = useState<WealthPartnerIdentityKind>("contact");
  const [childId, setChildId] = useState("");
  const [childLabel, setChildLabel] = useState("");
  const [relationshipType, setRelationshipType] = useState("network_member");
  const [memberPartnerType, setMemberPartnerType] = useState("others");
  const [saving, setSaving] = useState(false);
  const [networkRefreshToken, setNetworkRefreshToken] = useState(0);

  async function add() {
    if (!childId) {
      toast.error("Select a Contact or Company.");
      return;
    }
    setSaving(true);
    try {
      await wealthPartnerApiClient.addNetworkMember(partnerId, {
        identityKind,
        childContactId: identityKind === "contact" ? childId : null,
        childCompanyId: identityKind === "company" ? childId : null,
        childDisplayName: childLabel,
        relationshipType,
        memberPartnerType,
      });
      toast.success("Network member added (relationship only).");
      setChildId("");
      setChildLabel("");
      setNetworkRefreshToken((n) => n + 1);
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <WealthPartnerNetworkIntelligence
        partnerId={partnerId}
        refreshToken={networkRefreshToken}
      />

      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Add network members as relationships to Contact / Company masters â€” duplicates are never
          created. The Business Network above refreshes after each add.
        </p>
        <div className="grid max-w-2xl gap-3 rounded-xl border p-4">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={identityKind === "contact" ? "default" : "outline"}
              onClick={() => {
                setIdentityKind("contact");
                setChildId("");
                setChildLabel("");
              }}
            >
              Contact
            </Button>
            <Button
              type="button"
              size="sm"
              variant={identityKind === "company" ? "default" : "outline"}
              onClick={() => {
                setIdentityKind("company");
                setChildId("");
                setChildLabel("");
              }}
            >
              Company
            </Button>
          </div>
          <LiveEntityMasterSearch
            key={identityKind}
            kind={identityKind}
            warmOnMount
            selectedId={childId || undefined}
            selectedLabel={childLabel || undefined}
            onSelect={(opt) => {
              setChildId(opt.id);
              setChildLabel(opt.label);
            }}
            allowCreateNew={false}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Relationship Type</Label>
              <Select value={relationshipType} onValueChange={setRelationshipType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEALTH_PARTNER_NETWORK_RELATIONSHIP_TYPES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Member Type</Label>
              <Select value={memberPartnerType} onValueChange={setMemberPartnerType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEALTH_PARTNER_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="button" size="sm" disabled={saving} onClick={() => void add()}>
            Add Network Member
          </Button>
        </div>
      </div>

      {/* Compact relationship ledger (secondary to Business Network graph) */}
      <details className="rounded-xl border">
        <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground">
          Relationship ledger ({bundle.network.length})
        </summary>
        <div className="overflow-hidden border-t">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Member</th>
                <th className="px-3 py-2 text-left">Identity</th>
                <th className="px-3 py-2 text-left">Relationship</th>
                <th className="px-3 py-2 text-left">Effective</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {bundle.network.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    No network members yet.
                  </td>
                </tr>
              ) : (
                bundle.network.map((m) => (
                  <tr key={m.id} className="border-b">
                    <td className="px-3 py-2 font-medium">{m.childDisplayName}</td>
                    <td className="px-3 py-2 capitalize">{m.identityKind}</td>
                    <td className="px-3 py-2">{m.relationshipType}</td>
                    <td className="px-3 py-2 text-xs">
                      {new Date(m.effectiveDate).toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-3 py-2 capitalize">{m.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

