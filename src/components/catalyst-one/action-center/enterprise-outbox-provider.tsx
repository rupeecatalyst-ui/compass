"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  cancelOutboxMessage,
  dueOutboxMessages,
  getOutboxMessage,
  listOutboxMessages,
  markOutboxSent,
  OUTBOX_EVENT,
  pauseOutboxCountdown,
} from "@/lib/enterprise-action-center";
import { simulateEnceCommunication } from "@/lib/enterprise-notification-communication-engine";
import { appendEdcTimelineEntry } from "@/lib/enterprise-dialogue-center";
import type { OutboxMessage } from "@/types/enterprise-action-center";

export type OutboxDispatchHandler = (message: OutboxMessage) => void | Promise<void>;
export type OutboxEditHandler = (message: OutboxMessage) => void;

function OutboxToastCard({
  message,
  onSendNow,
  onEdit,
  onCancel,
}: {
  message: OutboxMessage;
  onSendNow: () => void;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const mins = Math.max(
    1,
    Math.round(Math.max(0, message.dispatchAtMs - Date.now()) / 60000),
  );
  return (
    <div className="w-[340px] rounded-xl border border-border/70 bg-card p-3 shadow-lg">
      <p className="text-sm font-semibold text-foreground">✓ Message added to Outbox</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Sending in {mins} minute{mins === 1 ? "" : "s"}… · {message.recipientName} ·{" "}
        {message.channel === "email" ? "Email" : "WhatsApp"}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Button type="button" size="sm" variant="outline" className="h-7 text-[11px]" onClick={onEdit}>
          Edit
        </Button>
        <Button type="button" size="sm" className="h-7 text-[11px]" onClick={onSendNow}>
          Send Now
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 text-[11px] text-muted-foreground"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

/**
 * Watches the Enterprise Outbox queue, shows review toasts, and auto-dispatches.
 */
export function EnterpriseOutboxProvider({
  onEdit,
  onDispatched,
  children,
}: {
  onEdit?: OutboxEditHandler;
  onDispatched?: OutboxDispatchHandler;
  children?: React.ReactNode;
}) {
  const onEditRef = useRef(onEdit);
  const onDispatchedRef = useRef(onDispatched);
  onEditRef.current = onEdit;
  onDispatchedRef.current = onDispatched;
  const toastIds = useRef<Map<string, string | number>>(new Map());
  const dispatching = useRef<Set<string>>(new Set());

  const dispatchMessage = useCallback(async (message: OutboxMessage) => {
    if (dispatching.current.has(message.id)) return;
    dispatching.current.add(message.id);
    try {
      markOutboxSent(message.id);
      const toastId = toastIds.current.get(message.id);
      if (toastId != null) toast.dismiss(toastId);
      toastIds.current.delete(message.id);

      simulateEnceCommunication({
        channel: message.channel,
        recipientRef: message.recipientId,
        contextRef: `${message.entityType}:${message.entityId}`,
        templateRef: message.templateId,
        payload: {
          subject: message.subject,
          body: message.body,
          recipientName: message.recipientName,
        },
        simulatedBy: "enterprise-outbox",
      });

      appendEdcTimelineEntry({
        contextRef: {
          type: message.entityType === "loan" ? "loan" : "opportunity",
          id: message.entityId,
        },
        eventType: message.channel === "email" ? "email" : "notification",
        title:
          message.channel === "email"
            ? `Email sent · ${message.recipientName}`
            : `WhatsApp sent · ${message.recipientName}`,
        description: message.subject || message.body.slice(0, 140),
        actorId: "enterprise-outbox",
        expandablePayload: {
          channel: message.channel,
          templateId: message.templateId,
          outboxId: message.id,
        },
      });

      await onDispatchedRef.current?.(message);
      toast.success(
        message.channel === "email" ? "Email dispatched" : "WhatsApp dispatched",
        {
          description: `${message.recipientName} · Timeline & communication history updated.`,
        },
      );
    } finally {
      dispatching.current.delete(message.id);
    }
  }, []);

  const showToastFor = useCallback(
    (message: OutboxMessage) => {
      if (message.status !== "queued") return;
      if (toastIds.current.has(message.id)) return;

      const id = toast.custom(
        (t) => (
          <OutboxToastCard
            message={message}
            onSendNow={() => {
              toast.dismiss(t);
              void dispatchMessage(message);
            }}
            onEdit={() => {
              pauseOutboxCountdown(message.id);
              toast.dismiss(t);
              toastIds.current.delete(message.id);
              const latest = getOutboxMessage(message.id);
              if (latest) onEditRef.current?.(latest);
            }}
            onCancel={() => {
              cancelOutboxMessage(message.id);
              toast.dismiss(t);
              toastIds.current.delete(message.id);
              toast.message("Message removed from Outbox");
            }}
          />
        ),
        { duration: Infinity, id: message.id },
      );
      toastIds.current.set(message.id, id);
    },
    [dispatchMessage],
  );

  useEffect(() => {
    const sync = () => {
      for (const m of listOutboxMessages()) {
        if (m.status === "queued") showToastFor(m);
      }
    };
    sync();
    window.addEventListener(OUTBOX_EVENT, sync);
    const tick = window.setInterval(() => {
      for (const due of dueOutboxMessages()) {
        void dispatchMessage(due);
      }
    }, 2000);
    return () => {
      window.removeEventListener(OUTBOX_EVENT, sync);
      window.clearInterval(tick);
    };
  }, [dispatchMessage, showToastFor]);

  return <>{children}</>;
}
