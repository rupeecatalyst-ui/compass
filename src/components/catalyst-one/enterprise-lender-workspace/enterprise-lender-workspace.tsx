"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  FileText,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
} from "lucide-react";
import {
  ELW_CERTIFICATION_FINDING,
  ELW_ENTERPRISE_PRINCIPLE,
  ELW_FRAMEWORK_VERSION,
  ELW_OFFICIAL_NAME,
} from "@/constants/enterprise-lender-workspace";
import { ChanakyaAvatar, ChanakyaIdentityLabel } from "@/components/catalyst-one/chanakya-enterprise-identity";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  applyElwSelectLender,
  deriveElwLenderProfile,
  getElwOriginLabel,
  parseElwOriginFromSearchParams,
} from "@/lib/enterprise-lender-workspace";
import { toast } from "sonner";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

export interface EnterpriseLenderWorkspaceProps {
  lenderId: string;
}

/**
 * CF-LIFE-010 — Enterprise Lender Workspace.
 * Dedicated lender evaluation surface with origin-aware Select Lender.
 */
export function EnterpriseLenderWorkspace({ lenderId }: EnterpriseLenderWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);

  const origin = useMemo(
    () => parseElwOriginFromSearchParams(searchParams),
    [searchParams],
  );

  const profile = useMemo(() => deriveElwLenderProfile(lenderId), [lenderId]);

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">Lender not found in the enterprise registry.</p>
        <Button asChild variant="outline" size="sm">
          <Link href={ROUTES.LENDERS}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Lenders
          </Link>
        </Button>
      </div>
    );
  }

  const originLabel = getElwOriginLabel(origin.from);

  const openTel = (mobile?: string) => {
    const tel = mobile?.replace(/\D/g, "");
    if (tel) window.open(`tel:${tel}`, "_self");
  };

  const openWhatsApp = (mobile?: string, name?: string) => {
    const tel = mobile?.replace(/\D/g, "");
    if (!tel) return;
    const text = encodeURIComponent(
      `Hello${name ? ` ${name}` : ""} — following up regarding ${profile.name}.`,
    );
    window.open(`https://wa.me/91${tel.slice(-10)}?text=${text}`, "_blank");
  };

  const openEmail = (email?: string) => {
    if (!email) return;
    const subject = encodeURIComponent(`Partnership · ${profile.name}`);
    window.open(`mailto:${email}?subject=${subject}`, "_self");
  };

  const onSelectLender = () => {
    setBusy(true);
    try {
      const result = applyElwSelectLender(profile, origin);
      toast.success(result.message);
      router.push(result.returnTo);
    } finally {
      setBusy(false);
    }
  };

  const onBack = () => {
    router.push(origin.returnTo);
  };

  const primary = profile.contacts.find((c) => c.isExecutor) ?? profile.contacts[0];

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to {originLabel}
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <Building2 className="h-5 w-5 text-teal-600 dark:text-teal-300" />
            <h1 className="text-xl font-semibold tracking-tight">{profile.name}</h1>
            <StatusPill variant="info">{ELW_CERTIFICATION_FINDING}</StatusPill>
            <StatusPill variant="muted">{ELW_FRAMEWORK_VERSION}</StatusPill>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">{ELW_ENTERPRISE_PRINCIPLE}</p>
          <p className="text-[11px] text-muted-foreground">
            {ELW_OFFICIAL_NAME} · evaluating without leaving {originLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            disabled={!primary?.mobile}
            onClick={() => openTel(primary?.mobile)}
          >
            <Phone className="h-3.5 w-3.5" />
            Call
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            disabled={!primary?.mobile}
            onClick={() => openWhatsApp(primary?.mobile, primary?.name)}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            disabled={!primary?.email}
            onClick={() => openEmail(primary?.email)}
          >
            <Mail className="h-3.5 w-3.5" />
            Email
          </Button>
          {origin.selectionMode && (
            <Button
              type="button"
              size="sm"
              className="h-9 rounded-lg bg-teal-600 hover:bg-teal-500"
              disabled={busy}
              onClick={onSelectLender}
            >
              Select Lender
            </Button>
          )}
        </div>
      </div>

      <Card className="glass-card border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Overview</CardTitle>
          <CardDescription>
            {profile.headquartersCity ? `HQ · ${profile.headquartersCity}` : "Enterprise lender profile"}
            {profile.branchNames.length > 0
              ? ` · ${profile.branchNames.slice(0, 3).join(", ")}`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed text-foreground/90">{profile.overview}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile
              label="Success outlook"
              value={`${profile.metrics.successProbability}%`}
            />
            <MetricTile label="Approval rate" value={profile.metrics.approvalRateLabel} />
            <MetricTile label="Avg TAT" value={`${profile.metrics.averageTatDays} days`} />
            <MetricTile label="Active cases" value={String(profile.metrics.activeCases)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Products</CardTitle>
            <CardDescription>Products facilitated with this lender.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {profile.products.length === 0 ? (
              <p className="text-sm text-muted-foreground">No product mappings yet.</p>
            ) : (
              profile.products.map((p) => (
                <span
                  key={p.productRef}
                  className="rounded-md border border-teal-500/25 bg-teal-500/5 px-2.5 py-1 text-xs font-medium text-teal-800 dark:text-teal-200"
                >
                  {p.label}
                </span>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-violet-500" />
              Policy summary
            </CardTitle>
            <CardDescription>{profile.policy.headline}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm text-foreground/85">
              {profile.policy.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Relationship contacts</CardTitle>
          <CardDescription>Direct Call, WhatsApp, and Email from this workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {profile.contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No executor contacts registered yet for this lender.
            </p>
          ) : (
            profile.contacts.map((contact) => (
              <div
                key={contact.contactId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{contact.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {contact.designation}
                    {contact.branchName ? ` · ${contact.branchName}` : ""}
                    {contact.city ? ` · ${contact.city}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    disabled={!contact.mobile}
                    onClick={() => openTel(contact.mobile)}
                    aria-label={`Call ${contact.name}`}
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    disabled={!contact.mobile}
                    onClick={() => openWhatsApp(contact.mobile, contact.name)}
                    aria-label={`WhatsApp ${contact.name}`}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    disabled={!contact.email}
                    onClick={() => openEmail(contact.email)}
                    aria-label={`Email ${contact.name}`}
                  >
                    <Mail className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {profile.documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">{doc.category}</p>
                </div>
                <StatusPill variant={doc.status === "available" ? "success" : "muted"}>
                  {doc.status === "available" ? "Available" : "Request"}
                </StatusPill>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card border-violet-500/20 bg-gradient-to-br from-violet-50/50 via-background to-background dark:from-violet-950/30">
          <CardHeader className="pb-2">
            <div className="flex gap-3">
              <ChanakyaAvatar size="md" />
              <div>
                <ChanakyaIdentityLabel surface="advisory" />
                <CardTitle className="mt-1 text-base">{profile.chanakya.headline}</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm leading-relaxed text-foreground/90">{profile.chanakya.body}</p>
            <p className="text-sm font-medium text-violet-800 dark:text-violet-200">
              {profile.chanakya.recommendation}
            </p>
          </CardContent>
        </Card>
      </div>

      {origin.selectionMode && (
        <div className="sticky bottom-4 z-10 flex justify-end">
          <Button
            type="button"
            size="lg"
            className={cn(
              "h-11 rounded-xl bg-teal-600 px-6 shadow-lg hover:bg-teal-500",
            )}
            disabled={busy}
            onClick={onSelectLender}
          >
            Select Lender — return to {originLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
