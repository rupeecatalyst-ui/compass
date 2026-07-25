"use client";

/**
 * Opportunity Document Requests — workflow workspace (not document storage).
 * LOD · secure upload link · reminders · readiness.
 * Uploads always land in Enterprise Document Registry SSOT.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Copy,
  Link2,
  Mail,
  MessageCircle,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  buildDocumentRequestEmailBody,
  buildDocumentRequestWhatsAppBody,
  DOCUMENT_REQUEST_EMAIL_SUBJECT,
} from "@/constants/document-requests";
import { queueOutboxMessage } from "@/lib/enterprise-action-center";
import {
  buildCustomerUploadPortalPath,
  createOrRegenerateUploadSession,
  deriveOpportunityDocumentReadiness,
  evaluateDocumentRequestLodReadiness,
  generateAndPersistLod,
  getDocumentRequestState,
  recordDocumentRequestCommunication,
  refreshDocumentRequestFromRegistry,
  subscribeDocumentRequestsUpdated,
} from "@/lib/document-requests";
import type {
  DocumentRequestCommEvent,
  DocumentRequestItemState,
  DocumentRequestWorkspaceState,
} from "@/types/document-requests";
import { useAuthContext } from "@/components/providers/auth-provider";
import { OwGlassPanel, OwInfoChip, OwKpiCard, OwPanelHeader, OwSectionLabel } from "./workspace-design";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";
import { cn } from "@/lib/utils";

function formatBorrowerType(employmentType?: string | null): string {
  const e = (employmentType || "").toLowerCase();
  if (!e) return "—";
  if (e.includes("self") || e.includes("business") || e.includes("professional")) {
    return "Self-employed";
  }
  if (e.includes("company") || e.includes("corporate")) return "Company";
  return "Salaried";
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function commLabel(kind: DocumentRequestCommEvent["kind"]): string {
  switch (kind) {
    case "lod_generated":
      return "LOD Generated";
    case "email_sent":
      return "Email Sent";
    case "whatsapp_sent":
      return "WhatsApp Sent";
    case "reminder_sent":
      return "Reminder Sent";
    case "customer_uploaded":
      return "Customer Uploaded";
    case "verification_completed":
      return "Verification Completed";
    case "link_regenerated":
      return "Upload Link Regenerated";
    default:
      return kind;
  }
}

function statusTone(status: DocumentRequestItemState["status"]): string {
  switch (status) {
    case "verified":
      return "text-emerald-300";
    case "uploaded":
    case "under_verification":
      return "text-teal-300";
    case "requested":
      return "text-amber-300";
    case "rejected":
      return "text-rose-300";
    default:
      return "text-zinc-400";
  }
}

export function WorkspaceDocumentRequestsPanel() {
  const { user } = useAuthContext();
  const {
    opportunityId,
    opportunityNumber,
    contact,
    productLabel,
    stageCode,
    leadCaseFile,
    opportunity,
  } = useOpportunityWorkspace();

  const actor =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Relationship Manager";

  const customerName = contact?.name?.trim() || leadCaseFile?.customerName || "—";
  const mobile = contact?.mobilePrimary || leadCaseFile?.customerMobile || "";
  const email = contact?.personalEmail || contact?.officialEmail || leadCaseFile?.customerEmail || "";
  const employmentType =
    contact?.employmentType || leadCaseFile?.employmentType || "";
  const constitution =
    leadCaseFile?.businessDetails?.constitution ||
    leadCaseFile?.participants?.find((p) => p.entityType === "company")?.constitution ||
    "";
  const borrowerTypeLabel = formatBorrowerType(employmentType);
  const oppRef =
    opportunityNumber ||
    opportunity?.opportunityCode ||
    opportunityId ||
    "—";
  const rmName =
    leadCaseFile?.relationshipManager ||
    contact?.ownerName ||
    actor;

  const lodGate = useMemo(
    () =>
      evaluateDocumentRequestLodReadiness({
        customerName: customerName === "—" ? "" : customerName,
        mobile,
        email,
        productLabel,
        employmentType,
        constitution,
      }),
    [customerName, mobile, email, productLabel, employmentType, constitution],
  );

  const [state, setState] = useState<DocumentRequestWorkspaceState>(() =>
    opportunityId ? getDocumentRequestState(opportunityId) : getDocumentRequestState(""),
  );

  const reload = useCallback(() => {
    if (!opportunityId) return;
    setState(refreshDocumentRequestFromRegistry(opportunityId, leadCaseFile?.id));
  }, [opportunityId, leadCaseFile?.id]);

  useEffect(() => {
    reload();
    return subscribeDocumentRequestsUpdated(reload);
  }, [reload]);

  const readiness = useMemo(
    () => deriveOpportunityDocumentReadiness(state.lodItems),
    [state.lodItems],
  );

  const criticalItems = state.lodItems.filter((i) => i.category === "critical");
  const journeyItems = state.lodItems.filter((i) => i.category === "journey");
  const pendingItems = state.lodItems.filter(
    (i) =>
      i.status === "pending" ||
      i.status === "requested" ||
      i.status === "rejected",
  );

  const absoluteUploadUrl = (token: string) => {
    const path = buildCustomerUploadPortalPath(token);
    if (typeof window === "undefined") return path;
    return `${window.location.origin}${path}`;
  };

  const ensureUploadSession = (regenerate = false) => {
    if (!opportunityId) return null;
    return createOrRegenerateUploadSession({
      opportunityId,
      opportunityReference: oppRef,
      customerName: customerName === "—" ? "Customer" : customerName,
      loanProduct: productLabel || "Loan",
      borrowerTypeLabel,
      constitutionLabel: constitution || "—",
      rmName,
      actor,
      regenerate,
    });
  };

  const onGenerateLod = () => {
    if (!opportunityId || !lodGate.canGenerate) return;
    const next = generateAndPersistLod({
      opportunityId,
      productLabel: productLabel || "",
      employmentType,
      constitution,
      transactionType: leadCaseFile?.transactionType === "balance_transfer"
        ? "balance_transfer"
        : "fresh",
      runtimeFile: leadCaseFile,
      actor,
    });
    ensureUploadSession(false);
    setState(getDocumentRequestState(opportunityId));
    toast.success(`LOD generated — ${next.lodItems.length} documents`);
  };

  const onCopyLink = async () => {
    let session = state.uploadSession;
    if (!session?.token || !session.active) {
      const next = ensureUploadSession(Boolean(session));
      session = next?.uploadSession;
      reload();
    }
    if (!session?.token) {
      toast.error("Generate LOD before creating an upload link.");
      return;
    }
    try {
      await navigator.clipboard.writeText(absoluteUploadUrl(session.token));
      toast.success("Secure upload link copied");
    } catch {
      toast.error("Unable to copy link");
    }
  };

  const onRegenerateLink = () => {
    if (!state.lodItems.length) {
      toast.error("Generate LOD first.");
      return;
    }
    ensureUploadSession(true);
    reload();
    toast.success("Upload link regenerated");
  };

  const onSendEmail = (asReminder = false) => {
    if (!opportunityId) return;
    if (!email.trim()) {
      toast.error("Customer email is required to send the document request.");
      return;
    }
    let session = state.uploadSession;
    if (!session?.token) {
      const next = ensureUploadSession(false);
      session = next?.uploadSession;
    }
    if (!session?.token) {
      toast.error("Generate LOD and upload link first.");
      return;
    }
    const uploadUrl = absoluteUploadUrl(session.token);
    const subject = DOCUMENT_REQUEST_EMAIL_SUBJECT.replace(
      "{{Loan Product}}",
      productLabel || "Loan",
    );
    const body = buildDocumentRequestEmailBody({
      customerName: customerName === "—" ? "Customer" : customerName,
      loanProduct: productLabel || "Loan",
      borrowerType: borrowerTypeLabel,
      constitution: constitution || "N/A",
      opportunityReference: oppRef,
      uploadUrl,
    });
    queueOutboxMessage({
      channel: "email",
      entityType: "opportunity",
      entityId: opportunityId,
      recipientId: contact?.id || opportunityId,
      recipientName: customerName === "—" ? "Customer" : customerName,
      recipientType: "customer",
      recipientEmail: email,
      templateName: asReminder ? "Document Request Reminder" : "Document Request LOD",
      subject: asReminder ? `Reminder: ${subject}` : subject,
      body: asReminder
        ? `Reminder — please upload pending documents.\n\n${body}`
        : body,
    });
    recordDocumentRequestCommunication(
      opportunityId,
      asReminder ? "reminder_sent" : "email_sent",
      actor,
      email,
    );
    reload();
    toast.success(asReminder ? "Reminder queued in Enterprise Outbox" : "Email queued in Enterprise Outbox");
  };

  const onSendWhatsApp = (asReminder = false) => {
    if (!opportunityId) return;
    if (!mobile.trim()) {
      toast.error("Customer mobile is required for WhatsApp.");
      return;
    }
    let session = state.uploadSession;
    if (!session?.token) {
      const next = ensureUploadSession(false);
      session = next?.uploadSession;
    }
    if (!session?.token) {
      toast.error("Generate LOD and upload link first.");
      return;
    }
    const uploadUrl = absoluteUploadUrl(session.token);
    const body = buildDocumentRequestWhatsAppBody({
      customerName: customerName === "—" ? "Customer" : customerName,
      loanProduct: productLabel || "Loan",
      uploadUrl,
    });
    queueOutboxMessage({
      channel: "whatsapp",
      entityType: "opportunity",
      entityId: opportunityId,
      recipientId: contact?.id || opportunityId,
      recipientName: customerName === "—" ? "Customer" : customerName,
      recipientType: "customer",
      recipientMobile: mobile,
      templateName: asReminder ? "Document Request Reminder WA" : "Document Request WA",
      body: asReminder ? `Reminder: ${body}` : body,
    });
    recordDocumentRequestCommunication(
      opportunityId,
      asReminder ? "reminder_sent" : "whatsapp_sent",
      actor,
      mobile,
    );
    reload();
    toast.success(asReminder ? "WhatsApp reminder queued" : "WhatsApp message queued");
  };

  return (
    <div className="space-y-4">
      <OwGlassPanel>
        <OwPanelHeader
          title="Document Requests"
          badge="Workflow"
          description="Generate LOD, request documents from the customer, and track Opportunity readiness. Storage remains Enterprise Document Registry."
        />
        <div className="flex flex-wrap gap-2">
          <OwInfoChip label="Opportunity" value={oppRef} />
          <OwInfoChip label="Customer" value={customerName} />
          <OwInfoChip label="Product" value={productLabel || "—"} />
          <OwInfoChip label="Borrower Type" value={borrowerTypeLabel} />
          <OwInfoChip label="Constitution" value={constitution || "—"} />
          <OwInfoChip label="RM" value={rmName || "—"} />
          <OwInfoChip label="Stage" value={stageCode || "—"} />
        </div>
      </OwGlassPanel>

      {!lodGate.canGenerate && (
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-3">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <div>
              <p className="text-xs font-semibold text-amber-100">Chanakya advisory</p>
              <p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-amber-50/90">
                {lodGate.chanakyaMessage}
              </p>
              <p className="mt-2 text-[10px] text-amber-200/80">
                Missing: {lodGate.gaps.map((g) => g.label).join(" · ")}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          className="h-8 text-xs"
          disabled={!lodGate.canGenerate || !opportunityId}
          onClick={onGenerateLod}
        >
          Generate LOD
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-8 gap-1.5 text-xs"
          disabled={!state.lodItems.length}
          onClick={() => onSendEmail(false)}
        >
          <Mail className="h-3.5 w-3.5" />
          Send Email
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-8 gap-1.5 text-xs"
          disabled={!state.lodItems.length}
          onClick={() => onSendWhatsApp(false)}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Send WhatsApp
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 border-white/15 text-xs"
          disabled={!state.lodItems.length}
          onClick={onCopyLink}
        >
          <Copy className="h-3.5 w-3.5" />
          Copy Upload Link
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 gap-1.5 text-xs text-zinc-300"
          disabled={!state.lodItems.length}
          onClick={onRegenerateLink}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Regenerate Link
        </Button>
      </div>

      <OwGlassPanel>
        <OwSectionLabel>LOD Summary</OwSectionLabel>
        <div className="mt-3 flex flex-wrap gap-2">
          <OwKpiCard label="Total" value={String(readiness.total)} />
          <OwKpiCard label="Uploaded" value={String(readiness.uploaded)} tone="info" />
          <OwKpiCard label="Verified" value={String(readiness.verified)} tone="good" />
          <OwKpiCard label="Pending" value={String(readiness.pending)} tone="warn" />
          <OwKpiCard
            label="Critical Pending"
            value={String(readiness.criticalPending)}
            tone={readiness.criticalPending > 0 ? "critical" : "good"}
          />
          <OwKpiCard label="Completion" value={`${readiness.completionPct}%`} tone="info" />
          <OwKpiCard
            label="Opportunity Readiness"
            value={readiness.label}
            tone={
              readiness.state === "ready_for_lender_submission"
                ? "good"
                : readiness.state === "awaiting_critical_documents"
                  ? "critical"
                  : "warn"
            }
          />
        </div>
        {state.uploadSession?.token && (
          <p className="mt-3 flex items-center gap-1.5 text-[10px] text-zinc-500">
            <Link2 className="h-3 w-3" />
            Secure session expires {formatDate(state.uploadSession.expiresAt)} · token never
            exposes Opportunity ID
          </p>
        )}
      </OwGlassPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <LodCategoryCard title="Critical Documents" items={criticalItems} empty="No critical documents in LOD yet." />
        <LodCategoryCard title="Journey Documents" items={journeyItems} empty="No journey documents in LOD yet." />
      </div>

      <OwGlassPanel>
        <OwPanelHeader title="Pending Items" description="Request, remind, and track customer submissions." />
        {pendingItems.length === 0 ? (
          <p className="text-xs text-zinc-500">
            {state.lodItems.length ? "No pending items." : "Generate LOD to see pending documents."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase tracking-wide text-zinc-500">
                  <th className="py-2 pr-2 font-medium">Document</th>
                  <th className="py-2 pr-2 font-medium">Priority</th>
                  <th className="py-2 pr-2 font-medium">Requested On</th>
                  <th className="py-2 pr-2 font-medium">Reminder</th>
                  <th className="py-2 pr-2 font-medium">Status</th>
                  <th className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingItems.map((item) => (
                  <tr key={item.typeRef} className="border-b border-white/5">
                    <td className="py-2.5 pr-2 font-medium text-zinc-100">{item.label}</td>
                    <td className="py-2.5 pr-2 capitalize text-zinc-400">{item.category}</td>
                    <td className="py-2.5 pr-2 text-zinc-400">{formatDate(item.requestedOn)}</td>
                    <td className="py-2.5 pr-2 capitalize text-zinc-400">
                      {item.reminderStatus || "none"}
                    </td>
                    <td className={cn("py-2.5 pr-2 capitalize", statusTone(item.status))}>
                      {item.status.replace(/_/g, " ")}
                    </td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[10px]"
                          onClick={() => onSendEmail(true)}
                        >
                          <Send className="mr-1 h-3 w-3" />
                          Reminder
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[10px]"
                          onClick={() => onSendEmail(false)}
                        >
                          Email
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[10px]"
                          onClick={() => onSendWhatsApp(false)}
                        >
                          WhatsApp
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[10px]"
                          onClick={onCopyLink}
                        >
                          Link
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OwGlassPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <OwGlassPanel>
          <OwSectionLabel>Customer Progress</OwSectionLabel>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <Fact label="Uploaded" value={String(readiness.uploaded)} />
            <Fact label="Pending" value={String(readiness.pending)} />
            <Fact
              label="Last Upload"
              value={formatDate(
                state.lodItems
                  .map((i) => i.uploadedAt)
                  .filter(Boolean)
                  .sort()
                  .at(-1),
              )}
            />
            <Fact label="Last Activity" value={formatDate(state.lastCustomerActivityAt)} />
            <Fact label="Progress" value={`${readiness.completionPct}%`} />
          </dl>
        </OwGlassPanel>

        <OwGlassPanel>
          <OwSectionLabel>Communication History</OwSectionLabel>
          {state.communications.length === 0 ? (
            <p className="mt-3 text-xs text-zinc-500">No communication events yet.</p>
          ) : (
            <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
              {state.communications.map((ev) => (
                <li
                  key={ev.id}
                  className="rounded-lg border border-white/8 bg-zinc-950/40 px-2.5 py-2 text-[11px]"
                >
                  <p className="font-medium text-zinc-100">{commLabel(ev.kind)}</p>
                  <p className="mt-0.5 text-zinc-500">
                    {formatDate(ev.at)} · {ev.actor}
                    {ev.detail ? ` · ${ev.detail}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </OwGlassPanel>
      </div>
    </div>
  );
}

function LodCategoryCard({
  title,
  items,
  empty,
}: {
  title: string;
  items: DocumentRequestItemState[];
  empty: string;
}) {
  return (
    <OwGlassPanel>
      <OwSectionLabel>{title}</OwSectionLabel>
      {items.length === 0 ? (
        <p className="mt-3 text-xs text-zinc-500">{empty}</p>
      ) : (
        <ul className="mt-3 max-h-56 space-y-1.5 overflow-y-auto">
          {items.map((item) => (
            <li
              key={item.typeRef}
              className="flex items-center justify-between gap-2 rounded-lg border border-white/8 px-2.5 py-1.5 text-xs"
            >
              <span className="truncate text-zinc-100">{item.label}</span>
              <span className={cn("shrink-0 capitalize", statusTone(item.status))}>
                {item.status.replace(/_/g, " ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </OwGlassPanel>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-950/45 px-2.5 py-2">
      <dt className="text-[9px] uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-zinc-100">{value}</dd>
    </div>
  );
}
