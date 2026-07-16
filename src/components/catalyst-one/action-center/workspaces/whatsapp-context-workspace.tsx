"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

export function WhatsAppContextWorkspace({
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
  const withMobile = useMemo(
    () => participants.filter((p) => Boolean(p.mobile) || p.recipientType === "customer"),
    [participants],
  );
  const pool = withMobile.length > 0 ? withMobile : participants;

  const [recipientId, setRecipientId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [body, setBody] = useState("");
  const [chanakyaHint, setChanakyaHint] = useState<string | null>(null);

  const recipient = pool.find((p) => p.id === recipientId) ?? pool[0] ?? null;

  const templates = useMemo(() => {
    if (!recipient) return [];
    return filterCommunicationTemplates({
      channel: "whatsapp",
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
      setBody(editingMessage.body);
      return;
    }
    setRecipientId(pool[0]?.id ?? "");
    setChanakyaHint(null);
  }, [open, editingMessage, pool]);

  useEffect(() => {
    if (!open || editingMessage) return;
    const recommended = templates.find((t) => t.recommended) ?? templates[0];
    if (!recommended) {
      setTemplateId("");
      setBody("");
      return;
    }
    setTemplateId(recommended.id);
    setBody(applyTemplatePlaceholders(recommended.body, vars));
  }, [open, editingMessage, templates, vars]);

  const applyTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setTemplateId(id);
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
        recipientMobile: recipient.mobile,
        templateId: templateId || undefined,
        templateName: templates.find((t) => t.id === templateId)?.name,
        body,
        status: "queued",
        dispatchAtMs: now + OUTBOX_COUNTDOWN_MS,
        dispatchAt: new Date(now + OUTBOX_COUNTDOWN_MS).toISOString(),
      });
      resumeOutboxCountdown(editingMessage.id);
    } else {
      queueOutboxMessage({
        channel: "whatsapp",
        entityType: "loan",
        entityId,
        recipientId: recipient.id,
        recipientName: recipient.name,
        recipientType: recipient.recipientType,
        recipientMobile: recipient.mobile,
        templateId: templateId || undefined,
        templateName: templates.find((t) => t.id === templateId)?.name,
        body,
      });
    }
    onOpenChange(false);
  };

  return (
    <ContextWorkspaceShell
      open={open}
      onOpenChange={onOpenChange}
      title="Send WhatsApp"
      description="Template is generated for the selected participant. Edit before queuing to the Outbox."
      entityLabel={entityLabel}
      onAskChanakya={() => {
        const rec = templates.find((t) => t.recommended);
        setChanakyaHint(
          rec
            ? `Best WhatsApp template: “${rec.name}”. Keep it short, clear, and actionable.`
            : "I need a recipient type with WhatsApp templates before I can recommend a draft.",
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
            {pool.map((p) => {
              const selected = (recipientId || pool[0]?.id) === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setRecipientId(p.id)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left transition-colors",
                    selected
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-border/60 hover:bg-muted/40",
                  )}
                >
                  <span className="block text-xs font-semibold text-foreground">{p.name}</span>
                  <span className="block text-[10px] capitalize text-muted-foreground">
                    {p.recipientType.replace(/_/g, " ")}
                    {p.mobile ? ` · ${p.mobile}` : " · mobile when available"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Template</Label>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            value={templateId}
            onChange={(e) => applyTemplate(e.target.value)}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.recommended ? "★ " : ""}
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Message</Label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-[160px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30"
          />
        </div>
      </div>
    </ContextWorkspaceShell>
  );
}
