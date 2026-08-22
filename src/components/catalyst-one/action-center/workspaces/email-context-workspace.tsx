"use client";

/**
 * CO-C1-FOLLOWUP-002 — Contextual Send Email (single Action Center entry).
 * Recipient types constrained to transaction context; corporate signature appended.
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { filterCommunicationTemplates } from "@/constants/enterprise-action-center";
import {
  applyTemplatePlaceholders,
  classifySendEmailRecipientGroup,
  SEND_EMAIL_RECIPIENT_GROUPS,
  type SendEmailRecipientGroupId,
} from "@/lib/enterprise-action-center";
import { appendCorporateEmailSignature } from "@/lib/enterprise-communication-center";
import { sendTransactionOperationalEmail } from "@/lib/enterprise-communication-center/operational-transaction-email-api";
import type { TransactionPrimaryToRole } from "@/lib/enterprise-communication-center/recipient-router";
import { searchAssignableUsers } from "@/lib/assigned-users";
import { useAuthContext } from "@/components/providers/auth-provider";
import { ContextWorkspaceShell } from "@/components/catalyst-one/action-center/context-workspace-shell";
import type {
  ContextParticipant,
  OutboxMessage,
} from "@/types/enterprise-action-center";
import type { AssignableUserOption } from "@/types/assigned-users";
import { cn } from "@/lib/utils";

export function EmailContextWorkspace({
  open,
  onOpenChange,
  opportunityId,
  dealId,
  entityId,
  entityLabel,
  product,
  stage,
  customerName,
  fileNumber,
  opportunityNumber,
  dealNumber,
  lender,
  rm,
  participants,
  preferredRecipientId,
  editingMessage,
  onEmailSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opportunity Registry SSOT — required for server recipient resolution. */
  opportunityId: string;
  dealId?: string | null;
  entityId: string;
  entityLabel: string;
  product?: string;
  stage?: string;
  customerName?: string;
  fileNumber?: string;
  opportunityNumber?: string;
  dealNumber?: string;
  lender?: string;
  rm?: string;
  participants: ContextParticipant[];
  /** CO-UX-015 — pre-select resolved recipient (Email to Lender / Customer / …). */
  preferredRecipientId?: string;
  editingMessage?: OutboxMessage | null;
  onEmailSent?: (summary: string) => void;
}) {
  const { user } = useAuthContext();
  const senderDisplayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    rm ||
    "Rupee Catalyst";

  const [recipientGroup, setRecipientGroup] =
    useState<SendEmailRecipientGroupId>("customer");
  const [recipientId, setRecipientId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [chanakyaHint, setChanakyaHint] = useState<string | null>(null);
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState<AssignableUserOption[]>([]);
  const [pickedEmployee, setPickedEmployee] = useState<ContextParticipant | null>(null);
  const [sending, setSending] = useState(false);

  const groupedParticipants = useMemo(() => {
    const map: Record<SendEmailRecipientGroupId, ContextParticipant[]> = {
      customer: [],
      wealth_partner: [],
      lender: [],
      internal_employee: [],
    };
    for (const p of participants) {
      const g = classifySendEmailRecipientGroup(p.recipientType);
      if (g) map[g].push(p);
    }
    return map;
  }, [participants]);

  const availableGroups = useMemo(
    () =>
      SEND_EMAIL_RECIPIENT_GROUPS.filter(
        (g) =>
          g.id === "internal_employee" ||
          (groupedParticipants[g.id]?.length ?? 0) > 0,
      ),
    [groupedParticipants],
  );

  const groupParticipants = groupedParticipants[recipientGroup] ?? [];

  const recipient =
    (pickedEmployee && recipientGroup === "internal_employee"
      ? pickedEmployee
      : null) ||
    groupParticipants.find((p) => p.id === recipientId) ||
    groupParticipants[0] ||
    null;

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
      opportunityNumber,
      dealNumber,
      lender,
      rm: rm || senderDisplayName,
    }),
    [
      recipient?.name,
      customerName,
      product,
      stage,
      fileNumber,
      opportunityNumber,
      dealNumber,
      lender,
      rm,
      senderDisplayName,
    ],
  );

  useEffect(() => {
    if (!open) return;
    if (editingMessage) {
      setRecipientId(editingMessage.recipientId);
      setTemplateId(editingMessage.templateId ?? "");
      setSubject(editingMessage.subject ?? "");
      setBody(editingMessage.body);
      const existing = participants.find((p) => p.id === editingMessage.recipientId);
      const g = existing
        ? classifySendEmailRecipientGroup(existing.recipientType)
        : null;
      if (g) setRecipientGroup(g);
      return;
    }
    const preferred = preferredRecipientId
      ? participants.find((p) => p.id === preferredRecipientId)
      : null;
    const preferredGroup = preferred
      ? classifySendEmailRecipientGroup(preferred.recipientType)
      : null;
    const initialGroup =
      preferredGroup && availableGroups.some((g) => g.id === preferredGroup)
        ? preferredGroup
        : availableGroups[0]?.id ?? "customer";
    setRecipientGroup(initialGroup);
    setPickedEmployee(null);
    setEmployeeQuery("");
    setChanakyaHint(null);
  }, [open, editingMessage, participants, preferredRecipientId, availableGroups]);

  useEffect(() => {
    if (!open || editingMessage) return;
    if (recipientGroup === "internal_employee" && pickedEmployee) {
      setRecipientId(pickedEmployee.id);
      return;
    }
    const preferred =
      preferredRecipientId &&
      groupParticipants.some((p) => p.id === preferredRecipientId)
        ? preferredRecipientId
        : groupParticipants[0]?.id ?? "";
    setRecipientId(preferred);
  }, [
    open,
    editingMessage,
    recipientGroup,
    groupParticipants,
    preferredRecipientId,
    pickedEmployee,
  ]);

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

  useEffect(() => {
    if (!open || recipientGroup !== "internal_employee") return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void searchAssignableUsers(employeeQuery)
        .then((rows) => {
          if (!cancelled) setEmployeeOptions(rows.slice(0, 8));
        })
        .catch(() => {
          if (!cancelled) setEmployeeOptions([]);
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [open, recipientGroup, employeeQuery]);

  const applyTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setTemplateId(id);
    setSubject(applyTemplatePlaceholders(t.subject ?? "", vars));
    setBody(applyTemplatePlaceholders(t.body, vars));
  };

  const sendEmail = () => {
    if (!recipient) {
      toast.message("Select a recipient linked to this transaction.");
      return;
    }
    if (!body.trim()) {
      toast.message("Message body is required.");
      return;
    }
    if (!opportunityId?.trim()) {
      toast.error("Opportunity context is required for server-side email delivery.");
      return;
    }

    const primaryToRole: TransactionPrimaryToRole = recipientGroup;
    const internalUserId =
      recipientGroup === "internal_employee" && pickedEmployee?.id
        ? pickedEmployee.id.replace(/^employee:/, "")
        : null;

    const signedBody = appendCorporateEmailSignature(body, {
      senderDisplayName,
      profileCode: "CUSTOMERS",
    });

    setSending(true);
    void sendTransactionOperationalEmail({
      opportunityId: opportunityId.trim(),
      dealId: dealId?.trim() || null,
      eventType: "customer_communication",
      primaryToRole,
      internalUserId,
      subject: subject.trim() || "(No subject)",
      textBody: signedBody,
      customerDisplayName: customerName ?? null,
      opportunityReference: opportunityNumber ?? dealNumber ?? null,
    })
      .then((result) => {
        if (result.deliveryStatus === "sent") {
          toast.success("Email sent", {
            description: `TO ${result.to.join(", ")}${result.cc.length ? ` · CC ${result.cc.join(", ")}` : ""}`,
          });
          onEmailSent?.(result.subject || signedBody.slice(0, 120));
          onOpenChange(false);
          return;
        }
        toast.error("Email failed", { description: result.message });
      })
      .catch((err: unknown) => {
        toast.error("Email failed", {
          description: err instanceof Error ? err.message : "Send failed",
        });
      })
      .finally(() => setSending(false));
  };

  return (
    <ContextWorkspaceShell
      open={open}
      onOpenChange={onOpenChange}
      title="Send Email"
      description="Recipients are resolved server-side from Opportunity/Deal SSOT. Templates use transaction context. Corporate signature is appended automatically."
      entityLabel={entityLabel}
      onAskChanakya={() => {
        const rec = templates.find((t) => t.recommended);
        setChanakyaHint(
          rec
            ? `I recommend “${rec.name}” for a ${recipient?.recipientType?.replace(/_/g, " ") ?? "recipient"} on ${product ?? "this product"} at stage ${stage ?? "current"}. Review the draft, then send.`
            : "Add a linked participant or complete relationship context so I can recommend a template.",
        );
        if (rec) applyTemplate(rec.id);
      }}
      footer={
        <Button
          type="button"
          size="sm"
          className="h-9 w-full text-xs"
          disabled={sending}
          onClick={sendEmail}
        >
          {sending ? "Sending…" : "Send Email"}
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
          <Label className="text-[11px] text-muted-foreground">Recipient type</Label>
          <div className="flex flex-wrap gap-1.5">
            {availableGroups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  setRecipientGroup(g.id);
                  setPickedEmployee(null);
                }}
                className={cn(
                  "h-7 rounded-md border px-2.5 text-[11px] font-medium",
                  recipientGroup === g.id
                    ? "border-teal-500/50 bg-teal-500/15 text-foreground"
                    : "border-border/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Recipient</Label>
          {recipientGroup === "customer" ||
          recipientGroup === "wealth_partner" ||
          recipientGroup === "lender" ? (
            <div className="grid gap-1.5">
              {groupParticipants.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground">
                  No {SEND_EMAIL_RECIPIENT_GROUPS.find((g) => g.id === recipientGroup)?.label} linked
                  to this transaction.
                </p>
              ) : (
                groupParticipants.map((p) => {
                  const selected = (recipientId || groupParticipants[0]?.id) === p.id;
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
          ) : (
            <div className="space-y-2">
              {groupParticipants.length > 0 ? (
                <div className="grid gap-1.5">
                  {groupParticipants.map((p) => {
                    const selected =
                      !pickedEmployee &&
                      (recipientId || groupParticipants[0]?.id) === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setPickedEmployee(null);
                          setRecipientId(p.id);
                        }}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-left transition-colors",
                          selected
                            ? "border-teal-500/40 bg-teal-500/10"
                            : "border-border/60 hover:bg-muted/40",
                        )}
                      >
                        <span className="block text-xs font-semibold text-foreground">
                          {p.name}
                        </span>
                        <span className="block text-[10px] text-muted-foreground">
                          Transaction RM · {p.email || "email when available"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <Input
                className="h-9 text-sm"
                placeholder="Search authorized internal employee by name…"
                value={employeeQuery}
                onChange={(e) => setEmployeeQuery(e.target.value)}
                aria-label="Search internal employee"
              />
              {employeeOptions.length > 0 ? (
                <div className="max-h-40 overflow-y-auto rounded-lg border border-border/70">
                  {employeeOptions.map((u) => {
                    const selected = pickedEmployee?.id === `employee:${u.id}`;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          const next: ContextParticipant = {
                            id: `employee:${u.id}`,
                            name: u.fullName,
                            recipientType: "hybrid_employee",
                            email: u.email || undefined,
                            identityRef: `identity:user:${u.id}`,
                          };
                          setPickedEmployee(next);
                          setRecipientId(next.id);
                          setEmployeeQuery(u.fullName);
                        }}
                        className={cn(
                          "block w-full border-b border-border/50 px-3 py-2 text-left text-xs last:border-b-0",
                          selected ? "bg-teal-500/10" : "hover:bg-muted/40",
                        )}
                      >
                        <span className="font-semibold text-foreground">{u.fullName}</span>
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">
                          {u.email || "No email on file"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">
            Template / purpose
          </Label>
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
            className="min-h-[160px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30"
          />
          <p className="text-[10px] text-muted-foreground">
            Rupee Catalyst corporate signature (sender: {senderDisplayName}) is appended on queue.
          </p>
        </div>

        <p className="text-[10px] text-muted-foreground">
          Messages enter the Enterprise Outbox for a 3-minute review before dispatch. External delivery remains
          simulation-gated by ENCE. Activity is recorded via EAR / Dialogue timeline.
        </p>
      </div>
    </ContextWorkspaceShell>
  );
}
