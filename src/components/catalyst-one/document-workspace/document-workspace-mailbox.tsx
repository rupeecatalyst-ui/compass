"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { previewTransactionOperationalEmail, type TransactionOperationalEmailPreview } from "@/lib/enterprise-communication-center/operational-transaction-email-api";
import type { TransactionPrimaryToRole } from "@/lib/enterprise-communication-center/recipient-router";
import { searchAssignableUsers } from "@/lib/assigned-users";
import type { AssignableUserOption } from "@/types/assigned-users";
import { DOCUMENT_WORKSPACE_ALLOWED_EXTENSIONS } from "@/constants/document-workspace-security";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DOCUMENT_WORKSPACE_SENDER_CC_MISSING } from "@/constants/document-workspace-refinement-014";
import { cn } from "@/lib/utils";

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
    textBody: string;
  }) => Promise<void>;
  onSaveDraft: (input: { subject: string; htmlBody: string; to: string }) => void;
}) {
  const [kind, setKind] = useState<DocumentWorkspaceComposerKind>(initialKind);
  const [to, setTo] = useState("");
  const [kept, setKept] = useState(attachments);
  const [subject, setSubject] = useState(
    mode === "request" ? "Document request" : "Documents for your review",
  );
  const [body, setBody] = useState("");
  const zip = false;
  const [primaryToRole, setPrimaryToRole] = useState<TransactionPrimaryToRole>("customer");
  const [internalUserId, setInternalUserId] = useState<string | null>(null);
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState<AssignableUserOption[]>([]);
  const [resolution, setResolution] = useState<TransactionOperationalEmailPreview | null>(null);
  const [resolving, setResolving] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const filePicker = useRef<HTMLInputElement>(null);
  const recipientScope = `${contextFingerprint}|${primaryToRole}|${internalUserId || ""}`;
  const latestScope = useRef(recipientScope);
  latestScope.current = recipientScope;
  const [resolvedScope, setResolvedScope] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const recipientValid = resolvedScope === recipientScope && resolution?.recipientResolution.ok === true;
  const senderValid = recipientValid && Boolean(resolution?.sender?.senderEmail);
  const ccLocked = resolution?.recipientResolution.ok ? resolution.recipientResolution.cc.join(", ") : senderCc.trim();

  useEffect(() => {
    if (!open || !opportunityId) return;
    let cancelled = false;
    setResolution(null);
    setResolvedScope(null);
    setTo("");
    if (primaryToRole === "internal_employee" && !internalUserId) return;
    setResolving(true);
    void previewTransactionOperationalEmail({ opportunityId, dealId, primaryToRole, internalUserId })
      .then(result => {
        if (cancelled || latestScope.current !== recipientScope) return;
        setResolution(result);
        setResolvedScope(recipientScope);
        setTo(result.recipientResolution.ok ? result.recipientResolution.to.join(", ") : "");
      })
      .catch(error => { if (!cancelled) toast.error(error instanceof Error ? error.message : "Recipient resolution failed"); })
      .finally(() => { if (!cancelled) setResolving(false); });
    return () => { cancelled = true; };
  }, [open, opportunityId, dealId, recipientScope, primaryToRole, internalUserId]);

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

  return (
    <div
      className="fixed inset-0 z-[95] flex flex-col bg-background"
      data-document-workspace-mailbox="014"
      role="dialog"
      aria-label={mode === "request" ? "Request Documents" : "Send Documents"}
    >
      <header className="flex items-center justify-between border-b border-border/70 px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold">
            {mode === "request" ? "Request Documents" : "Send Documents"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Recipients are verified before sending. Documents stay in Document Workspace.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onClose}>
          Close
        </Button>
      </header>
      <div className="flex gap-2 border-b border-border/60 px-4 py-2">
        {(["template", "custom"] as const).map((id) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={kind === id ? "default" : "outline"}
            className="capitalize"
            onClick={() => setKind(id)}
          >
            {id === "template" ? "Template" : "Custom Email"}
          </Button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-8">
        <div className="mx-auto grid max-w-5xl gap-3">
          <div>
            <Label className="text-xs">From</Label>
            <Input value={resolution?.sender?.senderEmail || fromEmail || "Resolving sender…"} readOnly />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <select aria-label="Recipient type" value={primaryToRole} onChange={e => { setPrimaryToRole(e.target.value as TransactionPrimaryToRole); setInternalUserId(null); }} className="mb-2 h-9 w-full rounded-md border bg-background px-3 text-sm">
              <option value="customer">Customer</option>
              <option value="internal_employee">Internal Employee</option>
              {dealId ? <option value="lender">Lender</option> : null}
            </select>
            {primaryToRole === "internal_employee" ? <>
              <Input aria-label="Search internal employee" placeholder="Search authorized employee" value={employeeQuery} onChange={e => setEmployeeQuery(e.target.value)} />
              <select aria-label="Internal employee" value={internalUserId || ""} onChange={e => setInternalUserId(e.target.value || null)} className="my-2 h-9 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">Select an employee</option>
                {employeeOptions.map(employee => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
              </select>
            </> : null}
            <Input value={recipientValid ? to : ""} readOnly placeholder={resolving ? "Resolving recipient…" : "No authorized recipient resolved"} />
            {resolution?.recipientResolution.ok === false ? <p className="mt-1 text-xs text-destructive">{resolution.recipientResolution.message}</p> : null}
          </div>
          <div>
            <Label className="text-xs">CC (mandatory sender copy)</Label>
            <Input value={ccLocked} readOnly data-mandatory-sender-cc="" />
            {!senderValid ? (
              <p className="mt-1 text-xs text-destructive">{DOCUMENT_WORKSPACE_SENDER_CC_MISSING}</p>
            ) : (
              <p className="mt-1 text-[10px] text-muted-foreground">
                Authenticated user copy cannot be removed. Manager / RC-owner CC is preserved server-side.
              </p>
            )}
          </div>
          <div>
            <Label className="text-xs">Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Message</Label>
            <Textarea
              className="min-h-[18rem] text-sm"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          {mode === "send" ? <div>
            <input ref={filePicker} type="file" className="hidden" accept={[...DOCUMENT_WORKSPACE_ALLOWED_EXTENSIONS].map(extension => `.${extension}`).join(",")} onChange={async event => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              const openedScope = recipientScope;
              setUploading(true);
              try {
                const attachment = await onAttachDocument(file);
                if (latestScope.current === openedScope) setKept(current => [...current.filter(item => item.id !== attachment.id), attachment]);
              } catch (error) { toast.error(error instanceof Error ? error.message : "Document upload failed"); }
              finally { setUploading(false); }
            }} />
            <Button type="button" variant="outline" disabled={uploading || sending} onClick={() => filePicker.current?.click()}>{uploading ? "Uploading…" : "Attach Document"}</Button>
          </div> : null}
          <div className="rounded-md border border-border/70 p-3 text-xs">
            <p className="font-medium">
              {mode === "request" ? "Exact requested documents" : "Attachments / versions"}
            </p>
            <ul className="mt-2 list-disc pl-5">
              {mode === "request"
                ? requestedList.map((item) => <li key={item}>{item}</li>)
                : kept.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-2">
                      <span>
                        {item.filename} · {item.versionLabel}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2"
                        onClick={() => setKept((rows) => rows.filter((row) => row.id !== item.id))}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
            </ul>
            {secureLink ? <p className="mt-2">Secure upload link: {secureLink}</p> : null}
          </div>
          {preview ? (
            <div className="rounded-md border border-dashed border-border p-3 text-sm" data-mailbox-preview="">
              <p className="font-medium">{subject}</p>
              <div className={cn("prose prose-sm mt-2 max-w-none")} dangerouslySetInnerHTML={{ __html: htmlBody }} />
            </div>
          ) : null}
        </div>
      </div>
      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 px-4 py-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => setPreview((v) => !v)}>
          Preview
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onSaveDraft({ subject, htmlBody, to })}
        >
          Save Draft
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!senderValid || !recipientValid || !resolution?.operationalDeliveryEnabled || !subject.trim() || (kind === "custom" && !body.trim()) || sending || uploading || resolving}
          onClick={async () => {
            if (!recipientValid) return;
            setSending(true);
            try { await onQueue({
              kind,
              to: to.split(",").map((item) => item.trim()).filter(Boolean),
              cc: senderValid ? [ccLocked] : [],
              subject,
              htmlBody,
              zip,
              documentIds: kept.map(item => item.id),
              primaryToRole,
              internalUserId,
              textBody: [body || "Please find the requested details below.", mode === "request" ? requestedList.join("\n") : "", mode === "request" && secureLink ? `Secure upload: ${secureLink}` : ""].filter(Boolean).join("\n\n"),
            }); } finally { setSending(false); }
          }}
        >
          {sending ? "Sending…" : "Send Email"}
        </Button>
      </footer>
    </div>
  );
}
