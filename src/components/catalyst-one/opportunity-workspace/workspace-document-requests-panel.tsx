"use client";

/**
 * Opportunity Document Requests — workflow workspace (not document storage).
 * LOD · secure upload link · reminders · readiness.
 * Uploads always land in Enterprise Document Registry SSOT.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  Link2,
  Loader2,
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
import { subscribeDocumentRegistryUpdated } from "@/lib/document-registry";
import { resolveOpportunityBorrowerIdentity } from "@/lib/enterprise-borrower-identity";
import {
  buildCustomerEngagementPortalPath,
  createOrRegenerateUploadSession,
  deriveOpportunityDocumentReadiness,
  EdieLodCertificationError,
  evaluateDocumentRequestLodReadiness,
  generateAndPersistLod,
  getActiveLodVersion,
  getDocumentRequestState,
  hasLodDimensionDrift,
  recordDocumentRequestCommunication,
  refreshDocumentRequestFromRegistry,
  subscribeDocumentRequestsUpdated,
} from "@/lib/document-requests";
import {
  loadStatedDraft,
  saveStatedDraft,
} from "@/lib/lead-opportunity-journey/stated-draft";
import {
  getEcmMasterLabel,
  listEcmMasterOptions,
} from "@/constants/enterprise-contact-master";
import type {
  DocumentRequestCommEvent,
  DocumentRequestItemState,
  DocumentRequestWorkspaceState,
} from "@/types/document-requests";
import { useAuthContext } from "@/components/providers/auth-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OwGlassPanel, OwInfoChip, OwKpiCard, OwPanelHeader, OwSectionLabel } from "./workspace-design";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";
import { cn } from "@/lib/utils";

const CONSTITUTION_OPTIONS = listEcmMasterOptions("constitution").filter((o) => o.id !== "other");

function formatBorrowerType(employmentType?: string | null): string {
  const e = (employmentType || "").toLowerCase();
  if (!e) return "—";
  if (e.includes("self") || e.includes("business") || e.includes("professional")) {
    return "Self-employed";
  }
  if (e.includes("company") || e.includes("corporate")) return "Company";
  return "Salaried";
}

function formatConstitutionLabel(value?: string | null): string {
  const raw = (value || "").trim();
  if (!raw) return "—";
  return getEcmMasterLabel("constitution", raw) || raw;
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
    case "lod_regenerated":
      return "Regenerated LOD";
    case "email_sent":
      return "Email Sent";
    case "whatsapp_sent":
      return "WhatsApp Sent";
    case "reminder_sent":
      return "Reminder Sent";
    case "customer_uploaded":
      return "Customer Uploaded Document";
    case "verification_completed":
      return "Verification Completed";
    case "link_regenerated":
      return "Upload Link Regenerated";
    case "upload_link_generated":
      return "Upload Link Generated";
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
    registryOpportunity,
  } = useOpportunityWorkspace();

  const actor =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Relationship Manager";

  const borrower = registryOpportunity
    ? resolveOpportunityBorrowerIdentity(registryOpportunity)
    : null;
  const customerName =
    borrower?.displayName ||
    contact?.name?.trim() ||
    leadCaseFile?.customerName ||
    "—";
  const mobile =
    borrower?.primaryContactMobile ||
    contact?.mobilePrimary ||
    leadCaseFile?.customerMobile ||
    "";
  const email =
    borrower?.primaryContactEmail ||
    contact?.personalEmail ||
    contact?.officialEmail ||
    leadCaseFile?.customerEmail ||
    "";
  const employmentType =
    contact?.employmentType || leadCaseFile?.employmentType || "";
  const statedDraft = useMemo(
    () => (leadCaseFile?.id ? loadStatedDraft(leadCaseFile.id) : {}),
    // Re-read when opportunity identity changes; constitutionOverride covers in-panel edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional identity-only reload
    [leadCaseFile?.id],
  );
  const [constitutionOverride, setConstitutionOverride] = useState<string>("");
  const constitution =
    constitutionOverride ||
    statedDraft.statedConstitution ||
    leadCaseFile?.businessDetails?.constitution ||
    leadCaseFile?.participants?.find((p) => p.entityType === "company")?.constitution ||
    "";
  const constitutionLabel = formatConstitutionLabel(constitution);
  const borrowerTypeLabel = formatBorrowerType(employmentType);
  const needsConstitution =
    borrowerTypeLabel === "Self-employed" || borrowerTypeLabel === "Company";
  const productForLod =
    productLabel && productLabel !== "Not Specified" ? productLabel : "";
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
        productLabel: productForLod,
        employmentType,
        constitution,
      }),
    [customerName, mobile, email, productForLod, employmentType, constitution],
  );

  const [state, setState] = useState<DocumentRequestWorkspaceState>(() =>
    opportunityId ? getDocumentRequestState(opportunityId) : getDocumentRequestState(""),
  );
  const [busy, setBusy] = useState(false);
  const autoRegenKeyRef = useRef<string>("");

  const reload = useCallback(() => {
    if (!opportunityId) return;
    setState(refreshDocumentRequestFromRegistry(opportunityId, leadCaseFile?.id));
  }, [opportunityId, leadCaseFile?.id]);

  useEffect(() => {
    reload();
    const unsubDr = subscribeDocumentRequestsUpdated(reload);
    const unsubReg = subscribeDocumentRegistryUpdated(reload);
    return () => {
      unsubDr();
      unsubReg();
    };
  }, [reload]);

  const activeVersion = useMemo(() => getActiveLodVersion(state), [state]);
  const dimensionDrift = useMemo(
    () =>
      hasLodDimensionDrift(activeVersion, {
        borrowerTypeLabel,
        productLabel: productForLod || "—",
        constitutionLabel: constitutionLabel || "—",
      }),
    [activeVersion, borrowerTypeLabel, productForLod, constitutionLabel],
  );

  const persistConstitution = useCallback(
    (value: string) => {
      setConstitutionOverride(value);
      if (leadCaseFile?.id) {
        const next = { ...loadStatedDraft(leadCaseFile.id), statedConstitution: value };
        saveStatedDraft(leadCaseFile.id, next);
      }
    },
    [leadCaseFile?.id],
  );

  const runGenerateLod = useCallback(
    (reason: "manual" | "dimension_change") => {
      if (!opportunityId || !lodGate.canGenerate) {
        if (!lodGate.canGenerate && lodGate.chanakyaMessage) {
          toast.error(lodGate.chanakyaMessage.split("\n").filter(Boolean)[0] ?? "Cannot generate LOD");
        }
        return;
      }
      setBusy(true);
      try {
        const next = generateAndPersistLod({
          opportunityId,
          productLabel: productForLod || "",
          employmentType,
          constitution,
          transactionType:
            leadCaseFile?.transactionType === "balance_transfer" ||
            /balance.?transfer|home.?loan.?bt|HOME_LOAN_BT/i.test(productForLod)
              ? "balance_transfer"
              : "fresh",
          runtimeFile: leadCaseFile,
          actor,
          opportunityReference: oppRef,
        });
        if (!state.uploadSession?.token) {
          createOrRegenerateUploadSession({
            opportunityId,
            opportunityReference: oppRef,
            customerName: customerName === "—" ? "Customer" : customerName,
            loanProduct: productForLod || "Loan",
            borrowerTypeLabel,
            constitutionLabel: constitutionLabel || "—",
            rmName,
            actor,
            regenerate: false,
          });
        }
        setState(getDocumentRequestState(opportunityId));
        toast.success(
          reason === "dimension_change"
            ? `LOD auto-regenerated (v${next.lodVersions?.[0]?.versionNumber ?? "—"}) — uploaded documents kept linked`
            : `LOD ${next.lodVersions && next.lodVersions.length > 1 ? "regenerated" : "generated"} — ${next.lodItems.length} documents`,
        );
      } catch (err) {
        const message =
          err instanceof EdieLodCertificationError
            ? err.message
            : err instanceof Error
              ? err.message
              : "LOD generation failed.";
        toast.error(message.split("\n").filter(Boolean)[0] ?? message);
      } finally {
        setBusy(false);
      }
    },
    [
      opportunityId,
      lodGate.canGenerate,
      lodGate.chanakyaMessage,
      productForLod,
      employmentType,
      constitution,
      constitutionLabel,
      leadCaseFile,
      actor,
      oppRef,
      state.uploadSession?.token,
      customerName,
      borrowerTypeLabel,
      rmName,
    ],
  );

  useEffect(() => {
    if (!opportunityId || !lodGate.canGenerate || !activeVersion || !dimensionDrift) return;
    const key = `${opportunityId}|${borrowerTypeLabel}|${productForLod}|${constitution}`;
    if (autoRegenKeyRef.current === key) return;
    autoRegenKeyRef.current = key;
    runGenerateLod("dimension_change");
  }, [
    opportunityId,
    lodGate.canGenerate,
    activeVersion,
    dimensionDrift,
    borrowerTypeLabel,
    productForLod,
    constitution,
    runGenerateLod,
  ]);

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
      i.status === "rejected" ||
      i.status === "re_upload_required",
  );

  const absoluteUploadUrl = (token: string) => {
    // CO-BIZ-004 — share full engagement portal (includes Documents tab).
    const path = buildCustomerEngagementPortalPath(token);
    if (typeof window === "undefined") return path;
    return `${window.location.origin}${path}`;
  };

  const ensureUploadSession = (regenerate = false) => {
    if (!opportunityId) return null;
    return createOrRegenerateUploadSession({
      opportunityId,
      opportunityReference: oppRef,
      customerName: customerName === "—" ? "Customer" : customerName,
      loanProduct: productForLod || "Loan",
      borrowerTypeLabel,
      constitutionLabel: constitutionLabel || "—",
      rmName,
      actor,
      regenerate,
    });
  };

  const onGenerateLod = () => runGenerateLod("manual");

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
      toast.success("Customer engagement link copied");
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
      productForLod || "Loan",
    );
    const body = buildDocumentRequestEmailBody({
      customerName: customerName === "—" ? "Customer" : customerName,
      loanProduct: productForLod || "Loan",
      borrowerType: borrowerTypeLabel,
      constitution: constitutionLabel || "N/A",
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
      oppRef,
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
      loanProduct: productForLod || "Loan",
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
      oppRef,
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
          <OwInfoChip label="Product" value={productForLod || productLabel || "—"} />
          <OwInfoChip label="Borrower Type" value={borrowerTypeLabel} />
          <OwInfoChip label="Constitution" value={needsConstitution ? constitutionLabel : "N/A"} />
          <OwInfoChip label="RM" value={rmName || "—"} />
          <OwInfoChip label="Stage" value={stageCode || "—"} />
        </div>
        {needsConstitution && (
          <div className="mt-3 max-w-sm">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Business Constitution (required for LOD)
            </p>
            <Select value={constitution || undefined} onValueChange={persistConstitution}>
              <SelectTrigger className="h-9 border-white/15 bg-zinc-950 text-xs text-zinc-100">
                <SelectValue placeholder="Select constitution for EDIE checklist" />
              </SelectTrigger>
              <SelectContent>
                {CONSTITUTION_OPTIONS.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </OwGlassPanel>

      {!lodGate.canGenerate && (
        <div
          className={
            lodGate.gaps.some((g) => g.field.startsWith("edie."))
              ? "rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-3"
              : "rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-3"
          }
        >
          <div className="flex items-start gap-2">
            <Sparkles
              className={
                lodGate.gaps.some((g) => g.field.startsWith("edie."))
                  ? "mt-0.5 h-4 w-4 shrink-0 text-rose-300"
                  : "mt-0.5 h-4 w-4 shrink-0 text-amber-300"
              }
            />
            <div>
              <p
                className={
                  lodGate.gaps.some((g) => g.field.startsWith("edie."))
                    ? "text-xs font-semibold text-rose-100"
                    : "text-xs font-semibold text-amber-100"
                }
              >
                {lodGate.gaps.some((g) => g.field.startsWith("edie."))
                  ? "EDIE certification required"
                  : "Chanakya advisory"}
              </p>
              <p
                className={
                  lodGate.gaps.some((g) => g.field.startsWith("edie."))
                    ? "mt-1 whitespace-pre-line text-[11px] leading-relaxed text-rose-50/90"
                    : "mt-1 whitespace-pre-line text-[11px] leading-relaxed text-amber-50/90"
                }
              >
                {lodGate.chanakyaMessage}
              </p>
              <p
                className={
                  lodGate.gaps.some((g) => g.field.startsWith("edie."))
                    ? "mt-2 text-[10px] text-rose-200/80"
                    : "mt-2 text-[10px] text-amber-200/80"
                }
              >
                {lodGate.gaps.some((g) => g.field.startsWith("edie."))
                  ? "Blocked:"
                  : "Missing:"}{" "}
                {lodGate.gaps.map((g) => g.label).join(" · ")}
              </p>
            </div>
          </div>
        </div>
      )}

      {dimensionDrift && activeVersion && (
        <div className="rounded-xl border border-sky-500/35 bg-sky-500/10 px-3 py-3 text-[11px] text-sky-50">
          Borrower Type, Product, or Business Constitution changed since LOD v
          {activeVersion.versionNumber}. Regenerating checklist — previously uploaded documents stay
          linked; only newly required items become Pending.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={!lodGate.canGenerate || !opportunityId || busy}
          onClick={onGenerateLod}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {state.lodItems.length ? "Regenerate LOD" : "Generate LOD"}
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
        <OwSectionLabel>EDIE Certified Checklist Review</OwSectionLabel>
        {!state.lodItems.length ? (
          <p className="mt-3 text-xs text-zinc-500">
            No LOD yet. Complete Customer Name, Mobile, Email, Product, Borrower Type
            {needsConstitution ? ", and Business Constitution" : ""}, then Generate LOD to review
            the certified checklist before sending to the customer.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              <OwInfoChip label="Product" value={activeVersion?.productLabel || productForLod || "—"} />
              <OwInfoChip
                label="Borrower Type"
                value={activeVersion?.borrowerTypeLabel || borrowerTypeLabel}
              />
              <OwInfoChip
                label="Business Constitution"
                value={
                  needsConstitution
                    ? activeVersion?.constitutionLabel || constitutionLabel
                    : "N/A"
                }
              />
              <OwInfoChip
                label="Version"
                value={activeVersion ? `v${activeVersion.versionNumber}` : "—"}
              />
              <OwInfoChip
                label="Generated"
                value={formatDate(activeVersion?.generatedAt || state.lodGeneratedAt)}
              />
              <OwInfoChip
                label="Required documents"
                value={String(activeVersion?.documentCount ?? state.lodItems.length)}
              />
            </div>
            <p className="text-[11px] text-zinc-400">
              Review the Critical and Journey lists below before Email / WhatsApp / Upload Link.
              No documents are uploaded automatically.
            </p>
          </div>
        )}
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
        <OwSectionLabel>LOD Version History</OwSectionLabel>
        {(state.lodVersions ?? []).length === 0 ? (
          <p className="mt-3 text-xs text-zinc-500">No LOD versions yet — generate to create v1.</p>
        ) : (
          <ul className="mt-3 max-h-44 space-y-2 overflow-y-auto">
            {(state.lodVersions ?? []).map((v) => (
              <li
                key={v.id}
                className={cn(
                  "rounded-lg border px-2.5 py-2 text-[11px]",
                  v.active
                    ? "border-teal-500/35 bg-teal-500/10"
                    : "border-white/8 bg-zinc-950/40",
                )}
              >
                <p className="font-medium text-zinc-100">
                  v{v.versionNumber}
                  {v.active ? " · Current Active Version" : ""} · {v.documentCount} documents
                </p>
                <p className="mt-0.5 text-zinc-500">
                  {formatDate(v.generatedAt)} · {v.generatedBy}
                </p>
                <p className="mt-0.5 text-zinc-500">
                  {v.borrowerTypeLabel} · {v.productLabel} · {v.constitutionLabel}
                </p>
              </li>
            ))}
          </ul>
        )}
      </OwGlassPanel>

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
