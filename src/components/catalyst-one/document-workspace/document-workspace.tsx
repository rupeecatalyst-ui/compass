"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  FolderUp,
  PanelRight,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DOCUMENT_WORKSPACE_OWNER_TABS,
  DOCUMENT_WORKSPACE_SUBTITLE,
  DOCUMENT_WORKSPACE_TITLE,
  type DocumentWorkspaceActionId,
  type DocumentWorkspaceOwnerTabId,
} from "@/constants/document-workspace";
import { DOCUMENT_REGISTRY_ACCEPT } from "@/constants/document-registry";
import { useAuthContext } from "@/components/providers/auth-provider";
import { DocumentWorkspaceSwitcher } from "@/components/catalyst-one/document-workspace/document-workspace-switcher";
import { DocumentWorkspacePreview } from "@/components/catalyst-one/document-workspace/document-workspace-preview";
import { DocumentWorkspaceActionDrawer } from "@/components/catalyst-one/document-workspace/document-workspace-action-drawer";
import { EmailContextWorkspace } from "@/components/catalyst-one/action-center/workspaces/email-context-workspace";
import { WhatsAppContextWorkspace } from "@/components/catalyst-one/action-center/workspaces/whatsapp-context-workspace";
import { EnterpriseActivityComposer } from "@/components/catalyst-one/action-center/workspaces/enterprise-activity-composer";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";
import {
  buildEntityLinksFromLoanFile,
  canReviewDocuments,
  canUploadDocuments,
  downloadDocumentFromRegistry,
  hydrateDocumentRegistryFromServer,
  listDocumentsForOpportunityRuntime,
  stampDocumentReview,
  subscribeDocumentRegistryUpdated,
  uploadDocumentToRegistry,
} from "@/lib/document-registry";
import {
  buildCustomerUploadPortalPath,
  createOrRegenerateUploadSession,
  deriveOpportunityDocumentReadiness,
  getDocumentRequestState,
  refreshDocumentRequestFromRegistry,
  requestDocumentItems,
  revokeUploadSession,
  setDocumentRequestItemReview,
  subscribeDocumentRequestsUpdated,
} from "@/lib/document-requests";
import {
  buildGroupedDocumentRequestBody,
  countDocumentWorkspaceReviews,
  documentWorkspaceReviewLabel,
  groupDocumentRequestItemsByOwner,
  listUnclassifiedReceivedDocuments,
  mergeDocumentWorkspaceRows,
  queueDocumentLenderPack,
  recordDocumentWorkspaceRequestBatch,
  selectedRequestRefs,
  type DocumentWorkspaceRow,
} from "@/lib/document-workspace";
import { mapDealLenderRecipients } from "@/lib/document-workspace/lender-pack";
import { resolveLoanParticipants } from "@/lib/loan-participants";
import { loadOpportunityJourneyRuntime } from "@/lib/lead-opportunity-journey/load-context";
import { buildOpportunityWorkspaceEntryHref } from "@/lib/loan-journey/adr-018-routing";
import { displayOpportunityAmount, displayOpportunityText } from "@/lib/lead-opportunity-journey/opportunity-field-display";
import { resolveLoanCommunicationParticipants, queueOutboxMessage, pauseOutboxCountdown } from "@/lib/enterprise-action-center";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import type { EnterpriseDealApiRecord } from "@/lib/enterprise-deal/deal-api-client";
import type { LoanFile } from "@/types/catalyst-one";
import { cn } from "@/lib/utils";
import type { OutboxMessage } from "@/types/enterprise-action-center";

export function DocumentWorkspace() {
  const { user } = useAuthContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const opportunityId = searchParams.get("opportunityId")?.trim() || "";
  const actor =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.email || "RM";

  const [file, setFile] = useState<LoanFile | null>(null);
  const [loading, setLoading] = useState(Boolean(opportunityId));
  const [registryTick, setRegistryTick] = useState(0);
  const [requestTick, setRequestTick] = useState(0);
  const [ownerTab, setOwnerTab] = useState<DocumentWorkspaceOwnerTabId>("primary");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [composer, setComposer] = useState<"email" | "whatsapp" | "followup" | null>(null);
  const [editingMessage, setEditingMessage] = useState<OutboxMessage | null>(null);
  const [deals, setDeals] = useState<EnterpriseDealApiRecord[]>([]);
  const [dealId, setDealId] = useState("");
  const [lenderRecipientId, setLenderRecipientId] = useState("");
  const [coverSubject, setCoverSubject] = useState("Document pack for review");
  const [coverBody, setCoverBody] = useState("");
  const [groupedDraft, setGroupedDraft] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [secureLink, setSecureLink] = useState("");
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const savedScroll = useRef(0);

  useEffect(() => {
    return subscribeDocumentRegistryUpdated(() => setRegistryTick((n) => n + 1));
  }, []);
  useEffect(() => {
    return subscribeDocumentRequestsUpdated(() => setRequestTick((n) => n + 1));
  }, []);

  useEffect(() => {
    if (!opportunityId) {
      setFile(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const runtime = await loadOpportunityJourneyRuntime(null, opportunityId, {
        dashboardEntry: false,
      });
      if (cancelled) return;
      setFile(runtime);
      await hydrateDocumentRegistryFromServer({
        opportunityId,
        opportunityNumber: runtime?.opportunityNumber,
      });
      refreshDocumentRequestFromRegistry(opportunityId, runtime?.id);
      try {
        const listed = await enterpriseDealApiClient.listDealsByOpportunity(opportunityId);
        if (!cancelled) {
          setDeals(listed.items);
          setDealId((current) => current || listed.items[0]?.id || "");
        }
      } catch {
        if (!cancelled) setDeals([]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [opportunityId]);

  const participants = useMemo(
    () => (file ? resolveLoanParticipants(file) : []),
    [file],
  );
  const requestState = opportunityId ? getDocumentRequestState(opportunityId) : null;
  const records = useMemo(() => {
    if (!opportunityId) return [];
    return listDocumentsForOpportunityRuntime(file?.id || opportunityId, opportunityId, {
      opportunityNumber: file?.opportunityNumber,
      customerId: file?.customerId,
      contactId: file?.customerId,
    });
  }, [opportunityId, file, registryTick, requestTick]);

  const rows = useMemo(
    () =>
      mergeDocumentWorkspaceRows({
        records,
        lodItems: requestState?.lodItems ?? [],
        participants,
      }),
    [records, requestState?.lodItems, participants],
  );
  const counts = useMemo(() => countDocumentWorkspaceReviews(rows), [rows]);
  const readiness = useMemo(
    () => deriveOpportunityDocumentReadiness(requestState?.lodItems ?? []),
    [requestState?.lodItems],
  );
  const unclassified = useMemo(() => listUnclassifiedReceivedDocuments(records), [records]);
  const tabRows = useMemo(
    () => rows.filter((row) => row.ownerTab === ownerTab),
    [rows, ownerTab],
  );
  const previewRow = rows.find((row) => row.id === previewId) || null;
  const selectedRows = rows.filter((row) => selectedIds.includes(row.id));
  const commParticipants = file ? resolveLoanCommunicationParticipants(file) : [];

  const selectOpportunity = useCallback(
    (id: string) => {
      router.replace(`/document-workspace?opportunityId=${encodeURIComponent(id)}`);
    },
    [router],
  );

  const openPreview = (id: string) => {
    savedScroll.current = tableScrollRef.current?.scrollTop ?? 0;
    setPreviewId(id);
  };
  const closePreview = () => {
    setPreviewId(null);
    setFullscreen(false);
    requestAnimationFrame(() => {
      if (tableScrollRef.current) tableScrollRef.current.scrollTop = savedScroll.current;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const uploadToRow = async (row: DocumentWorkspaceRow, files: FileList | File[]) => {
    if (!file || !canUploadDocuments(user)) {
      toast.error("You do not have permission to upload documents.");
      return;
    }
    const list = Array.from(files);
    for (const uploaded of list) {
      await uploadDocumentToRegistry({
        file: uploaded,
        typeRef: row.typeRef,
        categoryLabel: row.categoryLabel,
        uploadedBy: actor,
        uploadedByUserId: user?.id,
        links: buildEntityLinksFromLoanFile(file, {
          participantId: row.lodItem?.participantId,
          documentScope:
            row.ownerTab === "shared" || row.ownerTab === "property" ? "shared" : "applicant",
        }),
        replaceRecordId: row.registryRecordId,
        uploadSource: "manual_upload",
      });
    }
    refreshDocumentRequestFromRegistry(opportunityId, file.id);
    toast.success("Stored in Enterprise Document Registry.");
  };

  const applyReview = (
    row: DocumentWorkspaceRow,
    status: "accepted" | "rejected" | "replacement_requested",
    remarks?: string,
  ) => {
    if (!canReviewDocuments(user)) {
      toast.error("Analyst role required to review documents.");
      return;
    }
    if (row.record) {
      stampDocumentReview({
        recordId: row.record.id,
        reviewStatus: status,
        reviewedBy: actor,
        remarks,
      });
    }
    if (row.requestRef) {
      setDocumentRequestItemReview({
        opportunityId,
        requestRef: row.requestRef,
        status:
          status === "accepted"
            ? "verified"
            : status === "rejected"
              ? "rejected"
              : "re_upload_required",
        remarks,
      });
    }
    toast.success("Review recorded on the shared registry record.");
  };

  const buildGrouped = (source: DocumentWorkspaceRow[]) => {
    const items = source.map((row) => row.lodItem).filter(Boolean);
    const blocks = groupDocumentRequestItemsByOwner(items as NonNullable<DocumentWorkspaceRow["lodItem"]>[]);
    return buildGroupedDocumentRequestBody({
      customerName: displayOpportunityText(file?.customerName),
      opportunityReference: file?.opportunityNumber || opportunityId,
      product: displayOpportunityText(file?.loanProduct),
      uploadUrl: secureLink || undefined,
      dueDateLabel: dueDate || undefined,
      blocks,
    });
  };

  const onAction = (id: DocumentWorkspaceActionId) => {
    const pending = rows.filter((row) => row.reviewStatus === "pending");
    const target = id === "request_all_pending" ? pending : selectedRows.length ? selectedRows : pending;
    if (id === "request_selected" || id === "request_all_pending") {
      const refs = selectedRequestRefs(target.map((row) => row.lodItem!).filter(Boolean));
      if (refs.length) requestDocumentItems(opportunityId, refs);
      const draft = buildGrouped(target);
      setGroupedDraft(draft);
      const session = createOrRegenerateUploadSession({
        opportunityId,
        opportunityReference: file?.opportunityNumber || opportunityId,
        customerName: file?.customerName || "Customer",
        loanProduct: file?.loanProduct || "Loan",
        borrowerTypeLabel: "Individual",
        constitutionLabel: "Not Specified",
        rmName: file?.relationshipManager,
        actor,
      });
      const link = `${window.location.origin}${buildCustomerUploadPortalPath(session.uploadSession!.token)}`;
      setSecureLink(link);
      recordDocumentWorkspaceRequestBatch({
        opportunityId,
        recipientName: file?.customerName || "Customer",
        channel: "email",
        requestRefs: refs,
        requester: actor,
        dueAt: dueDate || undefined,
        groupedBody: draft,
        uploadToken: session.uploadSession?.token,
      });
      toast.message("Request drafted. Nothing has been sent.");
      return;
    }
    if (id === "custom_email" || id === "template_email") {
      const queued = queueOutboxMessage({
        channel: "email",
        entityType: "opportunity",
        entityId: opportunityId,
        recipientId: commParticipants[0]?.id || "customer",
        recipientName: commParticipants[0]?.name || file?.customerName || "Customer",
        recipientType: "customer",
        subject: "Document request",
        body: groupedDraft || buildGrouped(target),
      });
      pauseOutboxCountdown(queued.id);
      setEditingMessage(queued);
      setComposer("email");
      return;
    }
    if (id === "whatsapp") {
      setComposer("whatsapp");
      return;
    }
    if (id === "schedule_followup") {
      setComposer("followup");
      return;
    }
    if (id === "download_selected" || id === "download_pack") {
      const pack = (id === "download_pack" ? rows : selectedRows).filter((row) => row.record);
      void (async () => {
        for (const row of pack) {
          if (row.record) await downloadDocumentFromRegistry(row.record);
        }
      })();
      return;
    }
    if (id === "send_to_lender") {
      const eligible = selectedRows.filter((row) => row.reviewStatus === "accepted" && row.record);
      const fallback = rows.filter((row) => row.reviewStatus === "accepted" && row.record);
      const packRows = eligible.length ? eligible : fallback;
      const deal = deals.find((item) => item.id === dealId) ?? deals[0];
      if (!deal) {
        toast.error("Select a lender Deal first.");
        return;
      }
      const recipients = mapDealLenderRecipients(deal);
      const recipient = recipients.find((item) => item.id === lenderRecipientId) ?? recipients[0];
      if (!packRows.length) {
        toast.error("Only accepted document versions are eligible.");
        return;
      }
      queueDocumentLenderPack({
        opportunityId,
        dealId: deal.id,
        dealNumber: deal.dealNumber,
        recipientId: recipient?.id || deal.id,
        recipientName: recipient?.name || deal.primaryCounterpartyName || "Lender",
        recipientEmail: recipient?.email,
        records: packRows.map((row) => row.record!),
        coverBody: coverBody || "Please find the accepted document pack.",
        coverSubject,
        senderLabel: actor,
      });
      toast.success("Lender pack queued to Outbox. Email was not sent.");
    }
  };

  if (!opportunityId) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <header>
          <h1 className="text-xl font-semibold tracking-tight">{DOCUMENT_WORKSPACE_TITLE}</h1>
          <p className="text-xs text-muted-foreground">{DOCUMENT_WORKSPACE_SUBTITLE}</p>
        </header>
        <DocumentWorkspaceSwitcher onSelect={selectOpportunity} />
      </div>
    );
  }

  if (loading && !file) {
    return (
      <ChanakyaLoadingExperience
        module="documents"
        statusLabel="Opening Document Workspace…"
      />
    );
  }

  const oppHref = file
    ? buildOpportunityWorkspaceEntryHref({
        id: opportunityId,
      })
    : `/opportunities?opportunityId=${encodeURIComponent(opportunityId)}`;

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
      <header className="border-b border-border/60 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{DOCUMENT_WORKSPACE_TITLE}</h1>
            <p className="text-xs text-muted-foreground">{DOCUMENT_WORKSPACE_SUBTITLE}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={oppHref} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
              Open Opportunity
            </Link>
            <Button type="button" size="sm" variant="outline" onClick={() => setActionOpen(true)}>
              <PanelRight className="mr-1.5 h-3.5 w-3.5" />
              Action Centre
              {selectedIds.length ? (
                <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                  {selectedIds.length}
                </span>
              ) : null}
            </Button>
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:grid-cols-7">
          <Summary label="Customer" value={displayOpportunityText(file?.customerName)} />
          <Summary label="Opportunity" value={file?.opportunityNumber || opportunityId} />
          <Summary label="Product" value={displayOpportunityText(file?.loanProduct)} />
          <Summary
            label="Amount"
            value={displayOpportunityAmount(file?.requiredAmount ?? file?.loanAmount, {
              captured: (file as { amountCaptured?: boolean } | null)?.amountCaptured,
            })}
          />
          <Summary label="Assigned" value={displayOpportunityText(file?.relationshipManager)} />
          <Summary label="Readiness" value={`${readiness.label} · ${readiness.completionPct}%`} />
          <Summary
            label="Counts"
            value={`R ${counts.received} · P ${counts.pending} · U ${counts.under_review} · X ${counts.rejected} · E ${counts.expired}`}
          />
        </dl>
        {unclassified.length > 0 ? (
          <p className="mt-2 text-[11px] text-amber-700">
            Unclassified Received Documents: {unclassified.length} (Received — Review Pending, never auto-accepted).
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <DocumentWorkspaceSwitcher compact onSelect={selectOpportunity} />
        </div>
      </header>

      <Tabs value={ownerTab} onValueChange={(v) => setOwnerTab(v as DocumentWorkspaceOwnerTabId)}>
        <div className="overflow-x-auto border-b border-border/60 px-4 py-2 sm:px-6">
          <TabsList className="h-8">
            {DOCUMENT_WORKSPACE_OWNER_TABS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="text-xs">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      <div className={cn("flex min-h-0 flex-1", previewRow ? "lg:grid lg:grid-cols-2" : "")}>
        <div ref={tableScrollRef} className="min-w-0 flex-1 overflow-auto px-4 py-3 sm:px-6">
          <table className="w-full min-w-[64rem] text-left text-xs">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b border-border/70 text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="w-8 py-2"> </th>
                <th className="py-2">Category / Type</th>
                <th className="py-2">Owner</th>
                <th className="py-2">Status</th>
                <th className="py-2">Files</th>
                <th className="py-2">Requested</th>
                <th className="py-2">Received</th>
                <th className="py-2">Validity</th>
                <th className="py-2">Reviewer</th>
                <th className="py-2">Remarks</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tabRows.map((row) => (
                <tr key={row.id} className="border-b border-border/50 align-top">
                  <td className="py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onChange={() => toggleSelect(row.id)}
                      aria-label={`Select ${row.typeLabel}`}
                    />
                  </td>
                  <td className="py-2">
                    <p className="font-medium">{row.typeLabel}</p>
                    <p className="text-muted-foreground">{row.categoryLabel}</p>
                  </td>
                  <td className="py-2">{row.ownerLabel}</td>
                  <td className="py-2">{documentWorkspaceReviewLabel(row.reviewStatus)}</td>
                  <td className="py-2 tabular-nums">{row.fileCount}</td>
                  <td className="py-2">{fmt(row.requestedOn)}</td>
                  <td className="py-2">{fmt(row.receivedOn)}</td>
                  <td className="py-2">{fmt(row.validityUntil)}</td>
                  <td className="py-2">{row.reviewer || "—"}</td>
                  <td className="max-w-[10rem] py-2 text-muted-foreground">{row.remarks || "—"}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => openPreview(row.id)}>
                        Preview
                      </Button>
                      <label className="inline-flex h-7 cursor-pointer items-center rounded-md px-2 text-[11px] hover:bg-muted">
                        <Upload className="mr-1 h-3 w-3" />
                        File
                        <input
                          type="file"
                          className="hidden"
                          accept={DOCUMENT_REGISTRY_ACCEPT}
                          onChange={(e) => {
                            if (e.target.files?.length) void uploadToRow(row, e.target.files);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <label className="inline-flex h-7 cursor-pointer items-center rounded-md px-2 text-[11px] hover:bg-muted">
                        <FolderUp className="mr-1 h-3 w-3" />
                        Folder
                        <input
                          type="file"
                          className="hidden"
                          multiple
                          // @ts-expect-error webkitdirectory is valid in Chromium
                          webkitdirectory=""
                          onChange={(e) => {
                            if (e.target.files?.length) void uploadToRow(row, e.target.files);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </td>
                </tr>
              ))}
              {tabRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-muted-foreground">
                    No documents in this owner tab.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {previewRow ? (
          <DocumentWorkspacePreview
            row={previewRow}
            canReview={canReviewDocuments(user)}
            onClose={closePreview}
            onAccept={() => applyReview(previewRow, "accepted")}
            onReject={(reason) => applyReview(previewRow, "rejected", reason)}
            onRequestReplacement={(reason) => applyReview(previewRow, "replacement_requested", reason)}
            fullscreen={fullscreen}
            onToggleFullscreen={() => setFullscreen((v) => !v)}
          />
        ) : null}
      </div>

      <DocumentWorkspaceActionDrawer
        open={actionOpen}
        onOpenChange={setActionOpen}
        selectedCount={selectedIds.length}
        onAction={onAction}
        deals={deals}
        selectedDealId={dealId}
        onDealIdChange={setDealId}
        coverSubject={coverSubject}
        coverBody={coverBody}
        onCoverSubjectChange={setCoverSubject}
        onCoverBodyChange={setCoverBody}
        lenderRecipientId={lenderRecipientId}
        onLenderRecipientIdChange={setLenderRecipientId}
        groupedDraft={groupedDraft}
        onGroupedDraftChange={setGroupedDraft}
        dueDate={dueDate}
        onDueDateChange={setDueDate}
        secureLink={secureLink}
        taskContext={{
          opportunityId,
          dealId: dealId || undefined,
          contactId: file?.customerId,
        }}
      />

      {composer === "email" && file ? (
        <EmailContextWorkspace
          open
          onOpenChange={(open) => {
            if (!open) {
              setComposer(null);
              setEditingMessage(null);
            }
          }}
          opportunityId={opportunityId}
          dealId={dealId || null}
          entityId={opportunityId}
          entityLabel={file.customerName || "Opportunity"}
          product={file.loanProduct}
          customerName={file.customerName}
          opportunityNumber={file.opportunityNumber}
          rm={file.relationshipManager}
          participants={commParticipants}
          editingMessage={editingMessage}
        />
      ) : null}
      {composer === "whatsapp" && file ? (
        <WhatsAppContextWorkspace
          open
          onOpenChange={(open) => {
            if (!open) setComposer(null);
          }}
          entityId={opportunityId}
          entityLabel={file.customerName || "Opportunity"}
          product={file.loanProduct}
          customerName={file.customerName}
          rm={file.relationshipManager}
          participants={commParticipants}
        />
      ) : null}
      {composer === "followup" ? (
        <EnterpriseActivityComposer
          open
          onOpenChange={(open) => {
            if (!open) setComposer(null);
          }}
          heading="Schedule Follow-up"
          actorUserId={user?.id || "user"}
          actorLabel={actor}
          composer={{
            contextType: "opportunity",
            contextId: opportunityId,
            entityLabel: file?.customerName || "Opportunity",
            opportunityId,
            dealId: dealId || undefined,
            product: file?.loanProduct,
            customerName: file?.customerName,
          }}
        />
      ) : null}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}

function fmt(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  } catch {
    return "—";
  }
}
