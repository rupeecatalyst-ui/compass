"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { filterCommunicationTemplates, OUTBOX_COUNTDOWN_MS } from "@/constants/enterprise-action-center";
import {
  applyTemplatePlaceholders,
  queueOutboxMessage,
  resumeOutboxCountdown,
  updateOutboxMessage,
} from "@/lib/enterprise-action-center";
import { ContextWorkspaceShell } from "@/components/catalyst-one/action-center/context-workspace-shell";
import type {
  ContextParticipant,
  OutboxMessage,
} from "@/types/enterprise-action-center";
import { cn } from "@/lib/utils";

export function EmailContextWorkspace({
  open,
  onOpenChange,
  entityId,
  entityLabel,
  product,
  stage,
  customerName,
  fileNumber,
  rm,
  participants,
  editingMessage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  entityLabel: string;
  product?: string;
  stage?: string;
  customerName?: string;
  fileNumber?: string;
  rm?: string;
  participants: ContextParticipant[];
  editingMessage?: OutboxMessage | null;
}) {
  const [recipientId, setRecipientId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [chanakyaHint, setChanakyaHint] = useState<string | null>(null);

  const recipient =
    participants.find((p) => p.id === recipientId) ?? participants[0] ?? null;

  const templates = useMemo(() => {
    if (!recipient) return [];
    return filterCommunicationTemplates({
      channel: "email",
      recipientType: recipient.recipientType,
      product,
      stage,
    });
  }, [recipient, product, stage]);

  const vars = useMemo(
    () => ({
      name: recipient?.name,
      customerName,
      product,
      stage,
      fileNumber,
      rm,
    }),
    [recipient?.name, customerName, product, stage, fileNumber, rm],
  );

  useEffect(() => {
    if (!open) return;
    if (editingMessage) {
      setRecipientId(editingMessage.recipientId);
      setTemplateId(editingMessage.templateId ?? "");
      setSubject(editingMessage.subject ?? "");
      setBody(editingMessage.body);
      return;
    }
    setRecipientId(participants[0]?.id ?? "");
    setChanakyaHint(null);
  }, [open, editingMessage, participants]);

  useEffect(() => {
    if (!open || editingMessage) return;
    const recommended = templates.find((t) => t.recommended) ?? templates[0];
    if (!recommended) {
      setTemplateId("");
      setSubject("");
      setBody("");
      return;
    }
    setTemplateId(recommended.id);
    setSubject(applyTemplatePlaceholders(recommended.subject ?? "", vars));
    setBody(applyTemplatePlaceholders(recommended.body, vars));
  }, [open, editingMessage, templates, vars]);

  const applyTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setTemplateId(id);
    setSubject(applyTemplatePlaceholders(t.subject ?? "", vars));
    setBody(applyTemplatePlaceholders(t.body, vars));
  };

  const queue = () => {
    if (!recipient) {
      toast.message("Select a recipient linked to this transaction.");
      return;
    }
    if (!body.trim()) {
      toast.message("Message body is required.");
      return;
    }

    const now = Date.now();
    if (editingMessage) {
      updateOutboxMessage(editingMessage.id, {
        recipientId: recipient.id,
        recipientName: recipient.name,
        recipientType: recipient.recipientType,
        recipientEmail: recipient.email,
        templateId: templateId || undefined,
        templateName: templates.find((t) => t.id === templateId)?.name,
        subject,
        body,
        status: "queued",
        dispatchAtMs: now + OUTBOX_COUNTDOWN_MS,
        dispatchAt: new Date(now + OUTBOX_COUNTDOWN_MS).toISOString(),
      });
      resumeOutboxCountdown(editingMessage.id);
    } else {
      queueOutboxMessage({
        channel: "email",
        entityType: "loan",
        entityId,
        recipientId: recipient.id,
        recipientName: recipient.name,
        recipientType: recipient.recipientType,
        recipientEmail: recipient.email,
        templateId: templateId || undefined,
        templateName: templates.find((t) => t.id === templateId)?.name,
        subject,
        body,
      });
    }

    onOpenChange(false);
  };

  return (
    <ContextWorkspaceShell
      open={open}
      onOpenChange={onOpenChange}
      title="Send Email"
      description="Recipients are resolved from this transaction. Templates are filtered by recipient type, product, and stage."
      entityLabel={entityLabel}
      onAskChanakya={() => {
        const rec = templates.find((t) => t.recommended);
        setChanakyaHint(
          rec
            ? `I recommend “${rec.name}” for a ${recipient?.recipientType?.replace(/_/g, " ") ?? "recipient"} on ${product ?? "this product"} at stage ${stage ?? "current"}. Review the draft, then queue to Outbox.`
            : "Add a linked participant or complete relationship context so I can recommend a template.",
        );
        if (rec) applyTemplate(rec.id);
      }}
      footer={
        <Button type="button" size="sm" className="h-9 w-full text-xs" onClick={queue}>
          {editingMessage ? "Save & return to Outbox" : "Queue to Outbox"}
        </Button>
      }
    >
      <div className="space-y-4">
        {chanakyaHint ? (
          <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 px-3 py-2.5 text-xs leading-relaxed text-violet-950 dark:text-violet-100">
            <span className="font-semibold">Chanakya · </span>
            {chanakyaHint}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Recipient</Label>
          <div className="grid gap-1.5">
            {participants.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground">
                No participants linked to this transaction yet.
              </p>
            ) : (
              participants.map((p) => {
                const selected = (recipientId || participants[0]?.id) === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setRecipientId(p.id)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-left transition-colors",
                      selected
                        ? "border-teal-500/40 bg-teal-500/10"
                        : "border-border/60 hover:bg-muted/40",
                    )}
                  >
                    <span className="block text-xs font-semibold text-foreground">{p.name}</span>
                    <span className="block text-[10px] capitalize text-muted-foreground">
                      {p.recipientType.replace(/_/g, " ")}
                      {p.email ? ` · ${p.email}` : " · email on file when available"}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Template</Label>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            value={templateId}
            onChange={(e) => applyTemplate(e.target.value)}
          >
            {templates.length === 0 ? (
              <option value="">No templates for this recipient type</option>
            ) : (
              templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.recommended ? "★ " : ""}
                  {t.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Subject</Label>
          <Input
            className="h-9 text-sm"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Message</Label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-[180px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30"
          />
        </div>

        <p className="text-[10px] text-muted-foreground">
          Messages enter the Enterprise Outbox for a 3-minute review before dispatch. External delivery remains
          simulation-gated by ENCE.
        </p>
      </div>
    </ContextWorkspaceShell>
  );
}
