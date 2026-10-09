"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PanelRightClose, PanelRightOpen, X } from "lucide-react";
import { EnterpriseActivityComposer } from "@/components/catalyst-one/action-center/workspaces/enterprise-activity-composer";
import { DocumentWorkspaceMailbox } from "@/components/catalyst-one/document-workspace/document-workspace-mailbox";
import { useAuthContext } from "@/components/providers/auth-provider";
import { createUnclassifiedDocumentTypeRef } from "@/constants/document-intake";
import { buildOpportunityWorkspaceStageHref } from "@/constants/opportunity-workspace-stages";
import { pauseOutboxCountdown, queueOutboxMessage } from "@/lib/enterprise-action-center";
import { sendTransactionOperationalEmail } from "@/lib/enterprise-communication-center/operational-transaction-email-api";
import { canUploadDocuments, uploadDocumentToRegistry } from "@/lib/document-registry";
import {
  deskDocumentWorkspaceHref,
  deskEmailLaunch,
  type DeskDeal,
  type DeskOpportunity,
} from "@/lib/case-workbench/operational-desk";
import { buildDealWorkspaceHref } from "@/lib/loan-journey/adr-018-routing";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import { associatedLenderContacts, type DeskLenderContact } from "@/lib/case-workbench/operational-desk";
import { cn } from "@/lib/utils";
import { authenticatedJsonFetch } from "@/lib/api-client";

type PanelSection = "activity" | "tasks" | "email" | "contacts" | "documents" | "chanakya";

export function CaseWorkbenchActionPanel({
  opportunity,
  deal,
  collapsed,
  dirty,
  onDirty,
  onActivitySaved,
  onCollapse,
  onExpand,
  onRequestClose,
}: {
  opportunity: DeskOpportunity | null;
  deal: DeskDeal | null;
  collapsed: boolean;
  dirty: boolean;
  onDirty: (dirty: boolean) => void;
  onActivitySaved?: (activity: import("@/types/enterprise-conversation-activity").EnterpriseConversationActivity) => void;
  onCollapse: () => void;
  onExpand: () => void;
  onRequestClose: () => void;
}) {
  const { user } = useAuthContext();
  const [savedActivity, setSavedActivity] = useState<import("@/types/enterprise-conversation-activity").EnterpriseConversationActivity | null>(null);
  const [section, setSection] = useState<PanelSection>("activity");
  const [mailboxKind, setMailboxKind] = useState<"custom" | "template" | null>(null);
  const customer = deal?.customerName ?? opportunity?.customerName ?? "Not Specified";
  const product = deal?.product ?? opportunity?.product ?? "Not Specified";
  const stage = deal?.stageLabel ?? opportunity?.stageLabel ?? "Not Specified";
  const opportunityId = deal?.opportunityId ?? opportunity?.id ?? null;
  const contextKey = deal ? `deal:${deal.id}` : opportunity ? `opportunity:${opportunity.id}` : "none";
  const activityContextId = deal?.id ?? opportunity?.id;
  const activityContextType = deal?.id ? "deal" : "opportunity";
  useEffect(() => {
    if (!user?.id || !activityContextId) return;
    let cancelled = false;
    const id = activityContextId;
    const params = new URLSearchParams({ contextType: activityContextType, contextId: id });
    void authenticatedJsonFetch("/api/enterprise-conversation-activities?" + params, { cache: "no-store" }).then(async response => {
      const body = await response.json();
      if (!response.ok || !body.success || !body.data?.durable) return;
      const latest = (body.data.items as import("@/types/enterprise-conversation-activity").EnterpriseConversationActivity[])[0] ?? null;
      if (!cancelled) setSavedActivity(current => current?.contextId === id && (!latest || current.recordedAt >= latest.recordedAt) ? current : latest);
    }).catch(() => { /* Retain any confirmed activity while the next authorized read is unavailable. */ });
    return () => { cancelled = true; };
  }, [activityContextId, activityContextType, user?.id]);

  const workspaceHref = deal
    ? buildDealWorkspaceHref({
        dealId: deal.id,
        fileId: deal.fileId,
        opportunityId,
      })
    : opportunityId
      ? buildOpportunityWorkspaceStageHref("opportunity_creation", { opportunityId })
      : null;
  const documentsHref = deskDocumentWorkspaceHref({
    opportunityId,
    dealId: deal?.id ?? null,
    contactId: deal?.contactId ?? opportunity?.contactId ?? null,
  });
  const emailLaunch = deskEmailLaunch({
    opportunityId,
    dealId: deal?.id ?? null,
    kind: mailboxKind ?? "custom",
  });

  if (collapsed) {
    return (
      <div className="flex h-full flex-col items-center border-l border-border bg-card py-2">
        <button
          type="button"
          onClick={onExpand}
          className="rounded-md border border-input p-1.5 text-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="Expand Action Center"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-border bg-card" aria-label="Action Center">
      <header className="flex items-start justify-between gap-2 border-b border-border px-3 py-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
            {deal ? "Deal" : "Opportunity"}
          </p>
          <h2 className="truncate text-sm font-semibold text-foreground">{customer}</h2>
          <p className="truncate text-[11px] text-muted-foreground">
            {deal ? `${deal.lenderName} · ` : ""}
            {product} · {stage}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onCollapse}
            className="rounded-md border border-input p-1 text-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Collapse Action Center"
          >
            <PanelRightClose className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onRequestClose}
            className="rounded-md border border-input p-1 text-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Close Action Center"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>
      <div className="flex flex-wrap gap-1 border-b border-border px-2 py-1.5">
        {(
          [
            ["activity", "Activity"],
            ["tasks", "Tasks"],
            ["email", "Email"],
            ["contacts", "Lender contacts"],
            ["documents", "Documents"],
            ["chanakya", "CHANAKYA"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={cn(
              "rounded-md px-2 py-1 text-[11px] font-semibold",
              section === id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div key={contextKey} className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {section === "activity" ? (
          user?.id ? (
            <div onFocus={() => onDirty(true)}>
              <EnterpriseActivityComposer
                presentation="inline"
                composer={{
                  contextType: deal ? "deal" : "opportunity",
                  contextId: deal?.id ?? opportunity?.id ?? "",
                  entityLabel: deal ? `${customer} · ${deal.lenderName}` : customer,
                  opportunityId,
                  dealId: deal?.id ?? null,
                  contactId: deal?.contactId ?? opportunity?.contactId ?? null,
                  loanFileId: deal?.fileId ?? null,
                  product,
                  stage,
                  customerName: customer,
                }}
                actorUserId={user.id}
                actorLabel={user.email}
                onSaved={(activity, hasUnsavedContent) => {
                  onDirty(Boolean(hasUnsavedContent));
                  setSavedActivity(activity);
                  onActivitySaved?.(activity);
                }}
              />
              {savedActivity && savedActivity.contextId === (deal?.id ?? opportunity?.id) ? <div className="mt-2 text-xs text-muted-foreground"><p>Last Activity · {new Date(savedActivity.recordedAt).toLocaleString("en-IN")}</p><p className="whitespace-pre-wrap">{savedActivity.transcriptText || savedActivity.bodyText}</p></div> : null}
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground">Sign in to record activity on this transaction.</p>
          )
        ) : null}
        {section === "tasks" ? (
          <p role="status" className="text-[12px] text-muted-foreground">Tasks are temporarily unavailable while selected-Deal isolation is verified.</p>
        ) : null}
        {section === "email" ? (
          <div className="space-y-2 text-[12px] text-foreground">
            {emailLaunch.opportunityId ? (
              <>
                <p>Email opens the Document Workspace composer for this {deal ? "Deal" : "Opportunity"}.</p>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setMailboxKind("custom")}
                    className="rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    Custom Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setMailboxKind("template")}
                    className="rounded-md border border-input px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    Template Email
                  </button>
                </div>
                <DocumentWorkspaceMailbox
                  key={contextKey}
                  open={mailboxKind !== null}
                  contextFingerprint={`${emailLaunch.opportunityId}|${emailLaunch.dealId ?? ""}|${emailLaunch.kind}`}
                  opportunityId={emailLaunch.opportunityId}
                  dealId={emailLaunch.dealId}
                  initialKind={emailLaunch.kind}
                  templateContext={{ product, stage, variables: {
                    customerName: customer, product, stage,
                    lender: deal?.lenderName,
                    rm: [user?.firstName, user?.lastName].filter(Boolean).join(" "),
                  } }}
                  mode="send"
                  fromEmail={user?.email || ""}
                  senderCc={user?.email || ""}
                  initialTo=""
                  attachments={[]}
                  requestedList={[]}
                  onClose={() => setMailboxKind(null)}
                  onAttachDocument={async (file) => {
                    if (!canUploadDocuments(user) || !emailLaunch.opportunityId) {
                      throw new Error("You are not allowed to attach a document to this transaction.");
                    }
                    const { record } = await uploadDocumentToRegistry({
                      file,
                      typeRef: createUnclassifiedDocumentTypeRef(),
                      categoryLabel: "Other Documents",
                      uploadedBy: user?.email || "Case Workbench",
                      uploadedByUserId: user?.id,
                      links: {
                        opportunityId: emailLaunch.opportunityId,
                        ...(emailLaunch.dealId ? { dealId: emailLaunch.dealId } : {}),
                        documentScope: "shared",
                      },
                      uploadSource: "email",
                      requireServerPersistence: true,
                    });
                    return { id: record.id, filename: record.displayName, versionLabel: `v${record.version}` };
                  }}
                  onSaveDraft={({ subject, textBody, to, templateId, templateName }) => {
                    const queued = queueOutboxMessage({
                      channel: "email",
                      entityType: "opportunity",
                      entityId: emailLaunch.opportunityId || "",
                      recipientId: deal?.contactId || opportunity?.contactId || "customer",
                      recipientName: customer,
                      recipientType: "customer",
                      subject,
                      body: textBody,
                      recipientEmail: to || undefined,
                      templateId,
                      templateName,
                    });
                    pauseOutboxCountdown(queued.id);
                    toast.message("Draft saved to Outbox. Nothing has been sent.");
                  }}
                  onQueue={async ({ subject, textBody, documentIds, primaryToRole, internalUserId, includePrimaryTo, toRecipients, ccRecipients }) => {
                    if (!emailLaunch.opportunityId) return;
                    try {
                      const result = await sendTransactionOperationalEmail({
                        opportunityId: emailLaunch.opportunityId,
                        dealId: emailLaunch.dealId,
                        eventType: "customer_communication",
                        subject,
                        textBody,
                        documentIds,
                        primaryToRole,
                        internalUserId,
                        includePrimaryTo,
                        toRecipients,
                        ccRecipients,
                        customerDisplayName: customer,
                      });
                      if (!result.ok || result.deliveryStatus !== "sent") {
                        toast.error("Email was not sent. Please check the recipients and try again.");
                        return;
                      }
                      toast.success("Email sent");
                      setMailboxKind(null);
                    } catch {
                      toast.error("Email could not be sent. Please try again.");
                    }
                  }}
                />
              </>
            ) : (
              <p>This Deal has no Opportunity, so email stays in the full workspace.</p>
            )}
          </div>
        ) : null}
        {section === "contacts" ? (
          deal ? (
            <DealLenderContactList key={deal.id} dealId={deal.id} />
          ) : (
            <p className="text-[12px] text-foreground">No lender contacts associated with this Deal.</p>
          )
        ) : null}
        {section === "documents" ? (
          <div className="space-y-2 text-[12px] text-foreground">
            <p>Documents are edited only in Document Workspace.</p>
            {documentsHref ? (
              <Link href={documentsHref} className="inline-block text-[12px] font-semibold text-primary underline">
                Open Document Workspace
              </Link>
            ) : (
              <p>No Opportunity is linked, so Document Workspace cannot be opened for this row.</p>
            )}
          </div>
        ) : null}
        {section === "chanakya" ? (
          <div className="space-y-2 text-[12px] text-foreground">
            <p>CHANAKYA suggestions are advisory. They are not tasks until created in the Task Engine.</p>
            {workspaceHref ? (
              <Link href={workspaceHref} className="inline-block text-[12px] font-semibold text-primary underline">
                Open CHANAKYA in the full workspace
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
      {workspaceHref ? (
        <footer className="border-t border-border px-3 py-2">
          <Link href={workspaceHref} className="text-[12px] font-semibold text-primary underline">
            Open full {deal ? "Deal" : "Opportunity"} Workspace
          </Link>
          {dirty ? <p className="mt-1 text-[10px] text-amber-300">Unsaved activity is still open.</p> : null}
        </footer>
      ) : null}
    </aside>
  );
}

function DealLenderContactList({ dealId }: { dealId: string }) {
  const [contacts, setContacts] = useState<DeskLenderContact[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void enterpriseDealApiClient.getDeal(dealId, { forceRefresh: true }).then(row => {
      if (!cancelled) setContacts(associatedLenderContacts(row));
    }).catch(() => { if (!cancelled) setUnavailable(true); });
    return () => { cancelled = true; };
  }, [dealId]);
  if (unavailable) return <p role="status" className="text-[12px] text-muted-foreground">Lender contacts could not be authorized or loaded.</p>;
  if (!contacts) return <p role="status" className="text-[12px] text-muted-foreground">Loading lender contacts?</p>;
  if (!contacts.length) return <p role="status" className="text-[12px] text-muted-foreground">No lender contacts are associated with this Deal.</p>;
  return <div className="space-y-2">{contacts.map(contact => <div key={contact.id} className="rounded-md border border-border bg-card p-2 text-[12px]">
    <p className="font-semibold">{contact.name}</p>
    {contact.designation ? <p className="text-muted-foreground">{contact.designation}</p> : null}
    {contact.email ? <p>{contact.email}</p> : null}
    {contact.mobile ? <p>{contact.mobile}</p> : null}
  </div>)}</div>;
}
