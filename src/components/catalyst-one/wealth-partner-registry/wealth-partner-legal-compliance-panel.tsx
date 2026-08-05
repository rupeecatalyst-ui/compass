"use client";

/**
 * CO-WP-007 — Legal & Compliance tab for Wealth Partner Workspace.
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WEALTH_PARTNER_LEGAL_ORG_POLICY } from "@/constants/enterprise-wealth-partner-legal-docket";
import {
  downloadLegalDocument,
  openLegalDocumentView,
  registerLegalDocumentInEnterpriseRegistry,
} from "@/lib/enterprise-wealth-partner-legal-docket/registry-bridge";
import { wealthPartnerApiClient } from "@/lib/enterprise-wealth-partner-registry";
import type { WealthPartnerLegalComplianceProjection } from "@/types/enterprise-wealth-partner-legal-docket";
import type { WealthPartnerWorkspaceBundle } from "@/types/enterprise-wealth-partner-registry";

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function WealthPartnerLegalCompliancePanel({
  partnerId,
  bundle,
  onChanged,
}: {
  partnerId: string;
  bundle: WealthPartnerWorkspaceBundle;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const legal = bundle.legalCompliance;

  const summary = useMemo(() => {
    if (!legal) {
      return {
        agreementStatus: "not_started",
        agreementVersion: "—",
        effectiveFrom: null as string | null,
        effectiveUntil: null as string | null,
        daysRemaining: null as number | null,
        complianceStatus: "incomplete",
        renewalStatus: "not_applicable",
        selectabilityMessage: "Generate the Legal Docket to begin compliance.",
        documents: [] as WealthPartnerLegalComplianceProjection["documents"],
        versionHistory: [] as WealthPartnerLegalComplianceProjection["versionHistory"],
        timeline: [] as WealthPartnerLegalComplianceProjection["timeline"],
        reminders: [] as WealthPartnerLegalComplianceProjection["reminders"],
        docketReady: false,
        policy: WEALTH_PARTNER_LEGAL_ORG_POLICY,
      };
    }
    return legal;
  }, [legal]);

  async function linkRegistry(
    docs: WealthPartnerLegalComplianceProjection["documents"],
  ) {
    const links: Array<{ documentId: string; documentRegistryRecordId: string }> = [];
    for (const doc of docs) {
      if (doc.documentRegistryRecordId) continue;
      try {
        const regId = await registerLegalDocumentInEnterpriseRegistry({
          document: doc,
          identityKind: bundle.partner.identityKind,
          contactId: bundle.partner.contactId,
          companyId: bundle.partner.companyId,
          uploadedBy: "wealth-partner-legal-docket",
        });
        if (regId) links.push({ documentId: doc.id, documentRegistryRecordId: regId });
      } catch {
        /* best-effort — Legal Record content remains in complianceJson */
      }
    }
    if (links.length) {
      await wealthPartnerApiClient.runLegalDocketAction(partnerId, {
        action: "link_registry",
        documentRegistryLinks: links,
      });
    }
  }

  async function run(action: string, documentId?: string) {
    setBusy(action);
    try {
      await wealthPartnerApiClient.runLegalDocketAction(partnerId, {
        action,
        documentId,
      });
      toast.success("Legal Docket updated.");
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Legal Docket action failed");
    } finally {
      setBusy(null);
    }
  }

  async function generate(kind: "generate_docket" | "renew_reactivate") {
    setBusy(kind);
    try {
      const next = await wealthPartnerApiClient.runLegalDocketAction(partnerId, {
        action: kind,
      });
      const docs =
        next.legalCompliance?.documents.filter((d) => d.status !== "archived") ?? [];
      await linkRegistry(docs);
      toast.success(
        kind === "renew_reactivate"
          ? "Fresh Legal Docket generated (prior versions archived)."
          : "Legal Docket generated from Enterprise SSOT.",
      );
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy(null);
    }
  }

  async function onView(doc: WealthPartnerLegalComplianceProjection["documents"][number]) {
    openLegalDocumentView({
      document: doc,
      getPreviewUrl: async (id) => {
        const { getDocumentRegistryRecord, getDocumentPreviewUrl } = await import(
          "@/lib/document-registry"
        );
        const record = getDocumentRegistryRecord(id);
        if (!record) return null;
        return getDocumentPreviewUrl(record);
      },
    });
    try {
      await wealthPartnerApiClient.runLegalDocketAction(partnerId, {
        action: "record_view",
        documentId: doc.id,
      });
      await onChanged();
    } catch {
      /* non-blocking audit */
    }
  }

  async function onDownload(
    doc: WealthPartnerLegalComplianceProjection["documents"][number],
  ) {
    downloadLegalDocument(doc);
    try {
      await wealthPartnerApiClient.runLegalDocketAction(partnerId, {
        action: "record_download",
        documentId: doc.id,
      });
      await onChanged();
    } catch {
      /* non-blocking */
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm">Legal &amp; Compliance</CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Validity policy: {summary.policy.agreementValidityYears} years (Organisation
              Policy)
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Agreement Status" value={String(summary.agreementStatus)} />
            <Metric label="Agreement Version" value={summary.agreementVersion} />
            <Metric label="Effective From" value={fmtDate(summary.effectiveFrom)} />
            <Metric label="Valid Until" value={fmtDate(summary.effectiveUntil)} />
            <Metric
              label="Days Remaining"
              value={
                summary.daysRemaining == null ? "—" : String(summary.daysRemaining)
              }
            />
            <Metric label="Compliance Status" value={String(summary.complianceStatus)} />
            <Metric label="Renewal Status" value={String(summary.renewalStatus)} />
            <Metric label="Opportunity Selectability" value={summary.selectabilityMessage} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={!!busy}
              onClick={() => void generate("generate_docket")}
            >
              {busy === "generate_docket" ? "Generating…" : "Generate Legal Docket"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!!busy || !summary.docketReady}
              onClick={() => void run("mark_sent")}
            >
              Mark Sent
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!!busy || !summary.docketReady}
              onClick={() => void run("mark_partner_signed")}
            >
              Partner Signed
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!!busy || !summary.docketReady}
              onClick={() => void run("mark_countersigned")}
            >
              Company Counter-signed
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!!busy || !summary.docketReady}
              onClick={() => void run("activate")}
            >
              Activate Agreement
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!!busy}
              onClick={() => void generate("renew_reactivate")}
            >
              Renew / Reactivate
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={!!busy || !summary.docketReady}
              onClick={() => void run("suspend")}
            >
              Suspend
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            All documents are generated automatically from Contact, Wealth Partner,
            Commercial Profile, Organisation Settings, and KYC — no manual typing.
            Signed documents remain permanently viewable; versions are never overwritten.
            View uses Enterprise Document Registry when linked.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Signed / Generated Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Document</th>
                  <th className="px-3 py-2 text-left">Version</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Generated</th>
                  <th className="px-3 py-2 text-left">Signed</th>
                  <th className="px-3 py-2 text-left">Effective</th>
                  <th className="px-3 py-2 text-left">Until</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {summary.documents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                      No Legal Docket yet. Generate to create the 12-document pack.
                    </td>
                  </tr>
                ) : (
                  summary.documents.map((d) => (
                    <tr key={d.id} className="border-b">
                      <td className="px-3 py-2 font-medium">{d.documentName}</td>
                      <td className="px-3 py-2">v{d.version}</td>
                      <td className="px-3 py-2 capitalize">{d.status}</td>
                      <td className="px-3 py-2 text-xs">{fmtDate(d.generatedAt)}</td>
                      <td className="px-3 py-2 text-xs">{fmtDate(d.signedAt)}</td>
                      <td className="px-3 py-2 text-xs">{fmtDate(d.effectiveFrom)}</td>
                      <td className="px-3 py-2 text-xs">{fmtDate(d.effectiveUntil)}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => void onView(d)}
                          >
                            View
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => void onDownload(d)}
                          >
                            Download
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Version History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.versionHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No versions yet.</p>
            ) : (
              summary.versionHistory.map((group) => (
                <div key={group.documentKind} className="space-y-1">
                  <p className="text-xs font-semibold">{group.documentName}</p>
                  <div className="flex flex-wrap gap-1">
                    {group.versions.map((v) => (
                      <Badge
                        key={v.id}
                        variant={v.status === "archived" ? "outline" : "secondary"}
                        className="cursor-pointer text-[10px]"
                        onClick={() => void onView(v)}
                      >
                        v{v.version}
                        {v.status === "archived" ? " (archived)" : ""}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Compliance Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">No timeline events yet.</p>
            ) : (
              summary.timeline.slice(0, 12).map((e) => (
                <div
                  key={e.id}
                  className="rounded-md border border-border/60 px-2.5 py-1.5 text-xs"
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-medium capitalize">
                      {e.event.replace(/_/g, " ")}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(e.at).toLocaleString("en-GB")}
                    </span>
                  </div>
                  {e.detail ? (
                    <p className="mt-0.5 text-muted-foreground">{e.detail}</p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Renewal Reminders</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.reminders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Reminders schedule after Docket generation (180 / 90 / 30 days + expiry).
            </p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {summary.reminders.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-2.5 py-1.5"
                >
                  <span>{r.label}</span>
                  <span className="text-xs text-muted-foreground">
                    Due {fmtDate(r.dueAt)} · {r.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-muted/20 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xs font-medium capitalize text-foreground">{value}</p>
    </div>
  );
}
