"use client";

import { useEffect, useMemo, useState } from "react";
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
  mode,
  fromEmail,
  senderCc,
  initialTo,
  attachments,
  requestedList,
  secureLink,
  onClose,
  onQueue,
  onSaveDraft,
}: {
  open: boolean;
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
  }) => void;
  onSaveDraft: (input: { subject: string; htmlBody: string; to: string }) => void;
}) {
  const [kind, setKind] = useState<DocumentWorkspaceComposerKind>("template");
  const [to, setTo] = useState(initialTo);
  const [kept, setKept] = useState(attachments);
  const [subject, setSubject] = useState(
    mode === "request" ? "Document request" : "Documents for your review",
  );
  const [body, setBody] = useState("");
  const [zip, setZip] = useState(mode === "send");
  const [preview, setPreview] = useState(false);
  const senderValid = Boolean(senderCc.trim());
  const ccLocked = senderCc.trim();

  useEffect(() => {
    setKept(attachments);
  }, [attachments]);

  const htmlBody = useMemo(() => {
    const list =
      mode === "request"
        ? requestedList.map((item) => `<li>${item}</li>`).join("")
        : kept.map((item) => `<li>${item.filename} (${item.versionLabel})</li>`).join("");
    const link = secureLink ? `<p>Secure upload: ${secureLink}</p>` : "";
    return `<p>${body || (kind === "template" ? "Please find the requested details below." : "")}</p><ul>${list}</ul>${link}`;
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
            Large mailbox composer · existing Outbox · no live send from this desk
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
            <Input value={fromEmail || "Catalyst One (CUSTOMERS profile)"} readOnly />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Canonical contact email" />
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
          {mode === "send" ? (
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={zip} onChange={(e) => setZip(e.target.checked)} />
              Consolidate as ZIP (email attachment, never stored as a document)
            </label>
          ) : null}
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
          disabled={!senderValid || !to.trim()}
          onClick={() =>
            onQueue({
              kind,
              to: to.split(",").map((item) => item.trim()).filter(Boolean),
              cc: senderValid ? [ccLocked] : [],
              subject,
              htmlBody,
              zip,
            })
          }
        >
          Queue / Send
        </Button>
      </footer>
    </div>
  );
}
