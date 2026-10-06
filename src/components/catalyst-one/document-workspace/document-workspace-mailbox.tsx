"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { previewTransactionOperationalEmail, searchTransactionEmailRecipients, type TransactionOperationalEmailPreview } from "@/lib/enterprise-communication-center/operational-transaction-email-api";
import { recipientIdentityKey, type EmailRecipientOption, type EmailRecipientSelections } from "@/lib/enterprise-communication-center/recipient-selection";
import type { TransactionPrimaryToRole } from "@/lib/enterprise-communication-center/recipient-router";
import { searchAssignableUsers } from "@/lib/assigned-users";
import type { AssignableUserOption } from "@/types/assigned-users";
import { DOCUMENT_REGISTRY_ACCEPT } from "@/constants/document-registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export type DocumentWorkspaceMailboxMode = "request" | "send";
export type DocumentWorkspaceComposerKind = "template" | "custom";

export type MailboxAttachment = {
  id: string;
  filename: string;
  versionLabel: string;
};

export function DocumentWorkspaceMailbox({
  open,
  contextFingerprint,
  opportunityId,
  dealId,
  initialKind = "template",
  onAttachDocument,
  mode,
  fromEmail,
  senderCc,
  attachments,
  requestedList,
  secureLink,
  onClose,
  onQueue,
  onSaveDraft,
}: {
  open: boolean;
  contextFingerprint?: string | null;
  opportunityId: string;
  dealId?: string | null;
  initialKind?: DocumentWorkspaceComposerKind;
  onAttachDocument: (file: File) => Promise<MailboxAttachment>;
  mode: DocumentWorkspaceMailboxMode;
  fromEmail: string;
  senderCc: string;
  initialTo: string;
  attachments: MailboxAttachment[];
  requestedList: string[];
  secureLink?: string;
  onClose: () => void;
  onQueue: (input: {
    kind: DocumentWorkspaceComposerKind;
    to: string[];
    cc: string[];
    subject: string;
    htmlBody: string;
    zip: boolean;
    documentIds: string[];
    primaryToRole: TransactionPrimaryToRole;
    internalUserId: string | null;
    includePrimaryTo: boolean;
    toRecipients: EmailRecipientSelections["toRecipients"];
    ccRecipients: EmailRecipientSelections["ccRecipients"];
    textBody: string;
  }) => Promise<void>;
  onSaveDraft: (input: { subject: string; htmlBody: string; to: string }) => void;
}) {
  const kind = initialKind;
  const [to, setTo] = useState("");
  const [kept, setKept] = useState(attachments);
  const [subject, setSubject] = useState(
    mode === "request" ? "Document request" : "Documents for your review",
  );
  const [body, setBody] = useState("");
  const zip = false;
  const [primaryToRole, setPrimaryToRole] = useState<TransactionPrimaryToRole>("customer");
  const [internalUserId, setInternalUserId] = useState<string | null>(null);
  const [includePrimaryTo, setIncludePrimaryTo] = useState(true);
  const [toSelections, setToSelections] = useState<EmailRecipientOption[]>([]);
  const [ccSelections, setCcSelections] = useState<EmailRecipientOption[]>([]);
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipientTarget, setRecipientTarget] = useState<"to" | "cc">("to");
  const [addingRecipient, setAddingRecipient] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [recipientOptions, setRecipientOptions] = useState<EmailRecipientOption[]>([]);
  const recipientRefs = (options: EmailRecipientOption[]) => options.map(({ kind, id }) => ({ kind, id }));
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState<AssignableUserOption[]>([]);
  const [resolution, setResolution] = useState<TransactionOperationalEmailPreview | null>(null);
  const [resolving, setResolving] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const filePicker = useRef<HTMLInputElement>(null);
  const recipientScope = JSON.stringify([contextFingerprint, primaryToRole, internalUserId, includePrimaryTo, recipientRefs(toSelections), recipientRefs(ccSelections)]);
  const latestScope = useRef(recipientScope);
  latestScope.current = recipientScope;
  const [resolvedScope, setResolvedScope] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const recipientValid = resolvedScope === recipientScope && resolution?.recipientResolution.ok === true;
  const senderValid = Boolean(resolution?.initiatingSender?.email && resolution?.sender?.senderEmail);
  const ccLocked = resolution?.initiatingSender?.email || "";
  const unavailableRecipient = resolution?.recipientResolution.ok === false
    ? resolution.recipientResolution.code === "missing_customer_email"
      ? "No email address is recorded for this customer. Add a contact to continue."
      : resolution.recipientResolution.code === "customer_contact_selection_required"
      ? "Select a customer contact for this company."
      : "We couldn't verify this recipient. Please select another contact."
    : "";

  useEffect(() => {
    if (!open || !opportunityId) return;
    let cancelled = false;
    setResolution(null);
    setResolvedScope(null);
    setTo("");
    if (includePrimaryTo && primaryToRole === "internal_employee" && !internalUserId) { setResolving(false); return; }
    setResolving(true);
    void previewTransactionOperationalEmail({ opportunityId, dealId, primaryToRole, internalUserId, includePrimaryTo, toRecipients: recipientRefs(toSelections), ccRecipients: recipientRefs(ccSelections) })
      .then(result => {
        if (cancelled || latestScope.current !== recipientScope) return;
        setResolution(result);
        setResolvedScope(recipientScope);
        setTo(result.recipientResolution.ok ? result.recipientResolution.to.join(", ") : "");
      })
      .catch(() => { if (!cancelled) toast.error("We couldn't verify the email recipients. Please try again."); })
      .finally(() => { if (!cancelled) setResolving(false); });
    return () => { cancelled = true; };
  }, [open, opportunityId, dealId, recipientScope, primaryToRole, internalUserId]);

  useEffect(() => {
    setRecipientOptions([]);
    if (!open || !recipientQuery.trim()) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void searchTransactionEmailRecipients({ opportunityId, dealId, search: recipientQuery })
        .then(options => { if (!cancelled) setRecipientOptions(options); })
        .catch(() => { if (!cancelled) setRecipientOptions([]); });
    }, 200);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [open, opportunityId, dealId, contextFingerprint, recipientQuery]);

  useEffect(() => {
    if (!open || primaryToRole !== "internal_employee") return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void searchAssignableUsers(employeeQuery, { authorised: true }).then(users => {
        if (!cancelled) setEmployeeOptions(users);
      }).catch(() => { if (!cancelled) setEmployeeOptions([]); });
    }, 200);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [open, primaryToRole, employeeQuery]);

  useEffect(() => {
    setTo("");
    setResolution(null);
    setInternalUserId(null);
    setPrimaryToRole("customer");
    setIncludePrimaryTo(true);
    setToSelections([]);
    setCcSelections([]);
    setRecipientQuery("");
    setRecipientOptions([]);
    setAddingRecipient(false);
    setEmployeeQuery("");
    setEmployeeOptions([]);
    setKept(attachments);
    setSubject(mode === "request" ? "Document request" : "Documents for your review");
    setBody("");
    // Fingerprint is the authorization identity. Do not reset on local attachment edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- context-bound composer only
  }, [contextFingerprint]);

  const htmlBody = useMemo(() => {
    const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const list =
      mode === "request"
        ? requestedList.map((item) => `<li>${escape(item)}</li>`).join("")
        : kept.map((item) => `<li>${escape(item.filename)} (${escape(item.versionLabel)})</li>`).join("");
    const link = secureLink ? `<p>Secure upload: ${escape(secureLink)}</p>` : "";
    return `<p>${escape(body || (kind === "template" ? "Please find the requested details below." : ""))}</p><ul>${list}</ul>${link}`;
  }, [kept, body, kind, mode, requestedList, secureLink]);

  if (!open) return null;
  const resolved = resolution?.recipientResolution;
  const primaryParty = resolved?.partyRefs.find(party => party.role === (primaryToRole === "internal_employee" ? "transaction_manager" : "customer"));
  const primaryEmail = includePrimaryTo && resolved?.ok ? primaryParty?.email : null;
  const additionalCc = resolved?.ok ? resolved.cc.filter(email => email.toLowerCase() !== ccLocked.toLowerCase()) : [];
  const chipClass = "inline-flex max-w-full items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 text-xs";
  const addRecipient = (target: "to" | "cc") => { setRecipientTarget(target); setAddingRecipient(true); setRecipientQuery(""); setRecipientOptions([]); };

  return (
    <Dialog open={open} onOpenChange={next => { if (!next) onClose(); }}>
      <DialogContent
        className="z-[110] flex h-dvh max-h-dvh w-full max-w-none rounded-none sm:h-[94dvh] sm:max-h-[94dvh] sm:w-[94vw] flex-col gap-0 overflow-hidden p-0 sm:rounded-lg"
        overlayClassName="z-[109] bg-black/40"
        aria-describedby="document-workspace-email-description"
        onOpenAutoFocus={event => { event.preventDefault(); closeButton.current?.focus(); }}
        data-document-workspace-mailbox="014"
      >
        <header className="shrink-0 border-b px-4 py-3 pr-12">
          <DialogTitle className="text-base">{kind === "custom" ? "Custom Email" : mode === "request" ? "Request Documents" : "Send Documents"}</DialogTitle>
          <DialogDescription id="document-workspace-email-description" className="mt-1 text-xs">Compose for the current transaction. Nothing is sent until you choose Send Email.</DialogDescription>
          <Button ref={closeButton} type="button" size="sm" variant="ghost" className="mt-1 h-7" onClick={onClose}>Close</Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-3" data-email-content="">
          <div className="grid min-w-0 gap-3 md:flex md:h-full md:min-h-0 md:flex-col md:[&>*]:shrink-0">
            <div className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] items-start gap-2">
              <Label className="pt-1 text-xs">From</Label>
              <p className="break-all text-sm">{resolution?.sender?.displayName || "Catalyst One"} &lt;{resolution?.sender?.senderEmail || "Verifying sender…"}&gt;</p>
              <Label className="pt-1 text-xs">To</Label>
              <div className="flex min-w-0 flex-wrap items-center gap-1">
                {primaryEmail ? <span className={chipClass}><span className="min-w-0 break-all">{primaryParty?.name || (primaryToRole === "customer" ? "Customer" : primaryToRole === "lender" ? "Lender" : "Employee")} &lt;{primaryEmail}&gt;</span><Button type="button" size="sm" variant="ghost" className="h-6 shrink-0 px-1" aria-label="Remove primary recipient" onClick={() => setIncludePrimaryTo(false)}>×</Button></span> : null}
                {toSelections.map(option => <span key={recipientIdentityKey(option)} className={chipClass}><span className="min-w-0 break-all">{option.name} &lt;{option.email}&gt;</span><Button type="button" size="sm" variant="ghost" className="h-6 shrink-0 px-1" aria-label={`Remove TO ${option.name}`} onClick={() => setToSelections(rows => rows.filter(row => recipientIdentityKey(row) !== recipientIdentityKey(option)))}>×</Button></span>)}
                <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => addRecipient("to")}>+ Add recipient</Button>
                {resolving ? <span className="text-xs text-muted-foreground">Verifying…</span> : unavailableRecipient ? <p className="w-full text-xs text-muted-foreground">{unavailableRecipient}</p> : null}
              </div>
              <Label className="pt-1 text-xs">CC</Label>
              <div className="flex min-w-0 flex-wrap items-center gap-1">
                {ccLocked ? <span className={chipClass} data-mandatory-sender-cc="" aria-label="Authenticated user copy cannot be removed"><span className="min-w-0 break-all">{resolution?.initiatingSender?.name || "You"} &lt;{ccLocked}&gt;</span><span aria-label="Locked">🔒</span></span> : <span className="text-xs text-muted-foreground">{resolving ? "Verifying your email…" : "Your sender email could not be verified."}</span>}
                {additionalCc.map(email => {
                  const option = ccSelections.find(item => item.email.toLowerCase() === email.toLowerCase());
                  return <span key={email} className={chipClass}><span className="min-w-0 break-all">{option?.name || "Transaction copy"} &lt;{email}&gt;</span>{option ? <Button type="button" size="sm" variant="ghost" className="h-6 shrink-0 px-1" aria-label={`Remove CC ${option.name}`} onClick={() => setCcSelections(rows => rows.filter(row => recipientIdentityKey(row) !== recipientIdentityKey(option)))}>×</Button> : <span aria-label="Required transaction copy">🔒</span>}</span>;
                })}
                <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => addRecipient("cc")}>+ Add CC</Button>
              </div>
            </div>
            {addingRecipient ? <div className="rounded-md border p-2" data-recipient-picker="">
              <div className="mb-2 flex flex-wrap items-center gap-1">
                <span className="mr-1 text-xs">Add to {recipientTarget.toUpperCase()}</span>
                {recipientTarget === "to" ? <>{(["customer", "internal_employee", ...(dealId ? ["lender"] : [])] as TransactionPrimaryToRole[]).map(role => <Button key={role} type="button" size="sm" variant="ghost" className="h-7" onClick={() => { setPrimaryToRole(role); setIncludePrimaryTo(true); setInternalUserId(null); }}>{role === "customer" ? "Customer" : role === "lender" ? "Lender" : "Internal Employee"}</Button>)}</> : null}
                <Button type="button" size="sm" variant="ghost" className="ml-auto h-7" onClick={() => setAddingRecipient(false)}>Done</Button>
              </div>
              {primaryToRole === "internal_employee" && recipientTarget === "to" ? <select aria-label="Internal employee" value={internalUserId || ""} onChange={event => setInternalUserId(event.target.value || null)} className="mb-2 h-8 w-full rounded-md border bg-background px-2 text-sm"><option value="">Choose an employee, or search below</option>{employeeOptions.map(employee => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}</select> : null}
              <Input aria-label="Search email recipients" placeholder="Search authorized contacts by name or email" value={recipientQuery} onChange={event => { setRecipientQuery(event.target.value); setEmployeeQuery(event.target.value); }} />
              <div role="listbox" aria-label="Authorized email recipients" className="max-h-36 overflow-y-auto">
                {recipientOptions.map(option => <Button key={recipientIdentityKey(option)} type="button" variant="ghost" className="h-auto w-full justify-start whitespace-normal py-2 text-left" onClick={() => {
                  const setSelection = recipientTarget === "to" ? setToSelections : setCcSelections;
                  setSelection(rows => rows.some(row => recipientIdentityKey(row) === recipientIdentityKey(option) || row.email.toLowerCase() === option.email.toLowerCase()) ? rows : [...rows, option]);
                  // A missing convenience primary must not block explicit authorized TO choices.
                  if (recipientTarget === "to" && (resolved?.ok === false || (primaryToRole === "internal_employee" && !internalUserId))) setIncludePrimaryTo(false);
                  setRecipientQuery(""); setRecipientOptions([]);
                }}><span className="min-w-0 break-all">{option.name}<span className="block text-xs text-muted-foreground">{option.email} · {option.kind === "user" ? "Internal Employee" : option.kind === "lender_contact" ? "Lender Contact" : "Customer / Contact"}</span></span></Button>)}
              </div>
            </div> : null}
            <div><Label htmlFor="document-email-subject" className="text-xs">Subject</Label><Input id="document-email-subject" value={subject} onChange={event => setSubject(event.target.value)} /></div>
            <div className="md:!shrink md:flex md:min-h-32 md:flex-1 md:flex-col"><Label htmlFor="document-email-message" className="text-xs">Message</Label><Textarea id="document-email-message" className="min-h-48 resize-y text-sm md:min-h-0 md:flex-1 md:resize-none" value={body} onChange={event => setBody(event.target.value)} /></div>
            {mode === "request" ? <div className="rounded border p-2 text-xs md:max-h-24 md:overflow-y-auto"><p className="font-medium">Requested documents</p><ul className="mt-1 list-disc pl-4">{requestedList.map(item => <li key={item}>{item}</li>)}</ul></div> : null}
            <section aria-label="Attachments" className="min-w-0 rounded-md border p-2 text-xs">
              <p className="font-medium">Attachments</p>
              {kept.length ? <ul className="mt-1 space-y-1 md:max-h-28 md:overflow-y-auto">{kept.map(item => <li key={item.id} className="flex min-w-0 items-center justify-between gap-2"><span className="min-w-0 break-all">{item.filename} · {item.versionLabel}</span><Button type="button" size="sm" variant="ghost" className="h-7 shrink-0 px-2 text-xs" onClick={() => setKept((rows) => rows.filter((row) => row.id !== item.id))}>Remove from email</Button></li>)}</ul> : <p className="mt-1 text-muted-foreground">No attachments selected.</p>}
              <p className="mt-1 text-muted-foreground">Removing an attachment keeps the document in Document Workspace.</p>
            </section>
            <input ref={filePicker} type="file" className="hidden" accept={DOCUMENT_REGISTRY_ACCEPT} onChange={async event => {
              const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
              const openedScope = recipientScope; setUploading(true);
              try { const attachment = await onAttachDocument(file); if (latestScope.current === openedScope) setKept(current => [...current.filter(item => item.id !== attachment.id), attachment]); }
              catch (error) { toast.error(error instanceof Error ? error.message : "Document upload failed"); }
              finally { setUploading(false); }
            }} />
            {preview ? <div className="rounded-md border border-dashed p-2 text-sm md:max-h-32 md:overflow-y-auto" data-mailbox-preview=""><p className="font-medium">{subject}</p><div className={cn("prose prose-sm mt-1 max-w-none")} dangerouslySetInnerHTML={{ __html: htmlBody }} /></div> : null}
          </div>
        </div>
        <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t px-4 py-3">
          <Button type="button" size="sm" variant="outline" disabled={uploading || sending} onClick={() => filePicker.current?.click()}>{uploading ? "Uploading…" : "Attach Document"}</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setPreview(value => !value)}>Preview</Button>
          <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={() => onSaveDraft({ subject, htmlBody, to })}>Save Draft</Button>
          <Button type="button" size="sm" disabled={!senderValid || !recipientValid || !resolution?.operationalDeliveryEnabled || !subject.trim() || (kind === "custom" && !body.trim()) || sending || uploading || resolving} onClick={async () => {
            if (!recipientValid || !senderValid) return;
            setSending(true);
            try { await onQueue({ kind, to: resolved?.ok ? resolved.to : [], cc: resolved?.ok ? resolved.cc : [], subject, htmlBody, zip,
              documentIds: kept.map(item => item.id), primaryToRole, internalUserId, includePrimaryTo,
              toRecipients: recipientRefs(toSelections), ccRecipients: recipientRefs(ccSelections),
              textBody: [body || "Please find the requested details below.", mode === "request" ? requestedList.join("\n") : "", mode === "request" && secureLink ? `Secure upload: ${secureLink}` : ""].filter(Boolean).join("\n\n"),
            }); } finally { setSending(false); }
          }}>{sending ? "Sending…" : "Send Email"}</Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
