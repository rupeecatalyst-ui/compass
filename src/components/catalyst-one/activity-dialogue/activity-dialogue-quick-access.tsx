"use client";

/**
 * Global Activity & Dialogue quick access — EAR chronology + ENE unread badge.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { History, Mail, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthContext } from "@/components/providers/auth-provider";
import { ROUTES } from "@/constants/routes";
import { listEnterpriseActivity } from "@/lib/enterprise-activity-registry";
import {
  listEnterpriseNotifications,
  markEnterpriseNotificationRead,
} from "@/lib/enterprise-notification-engine";
import type { EnterpriseActivityEvent } from "@/types/enterprise-activity-registry";
import type { EnterpriseNotificationItem } from "@/types/enterprise-notification-engine";
import { formatRelativeTime, cn } from "@/lib/utils";

const COMM_ENE_TYPES = new Set([
  "CUSTOMER_EMAIL_RECEIVED",
  "CUSTOMER_EMAIL_ATTACHMENT_RECEIVED",
  "TRANSACTION_EMAIL_SENT",
  "TRANSACTION_EMAIL_FAILED",
]);

function activityHref(event: EnterpriseActivityEvent): string {
  const payload = (event.payload || {}) as Record<string, unknown>;
  const inboundEmailId =
    typeof payload.inboundEmailId === "string" ? payload.inboundEmailId : null;
  const params = new URLSearchParams();
  if (inboundEmailId) params.set("inboundEmailId", inboundEmailId);
  if (event.opportunityId) params.set("opportunityId", event.opportunityId);
  if (event.dealId) params.set("dealId", event.dealId);
  const q = params.toString();
  return q ? `${ROUTES.ACTIVITY}?${q}` : ROUTES.ACTIVITY;
}

function isIncomingEmail(event: EnterpriseActivityEvent): boolean {
  const payload = (event.payload || {}) as Record<string, unknown>;
  return (
    event.sourceSystem === "inbound_email" ||
    payload.kind === "email_received" ||
    payload.eventType === "email_received"
  );
}

function needsAttention(event: EnterpriseActivityEvent): boolean {
  const payload = (event.payload || {}) as Record<string, unknown>;
  return (
    payload.needsAttention === true ||
    payload.matchStatus === "needs_review" ||
    payload.matchStatus === "unmatched" ||
    payload.matchStatus === "received"
  );
}

export function ActivityDialogueQuickAccess() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthContext();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<EnterpriseActivityEvent[]>([]);
  const [unreadComms, setUnreadComms] = useState<EnterpriseNotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;
    setLoading(true);
    try {
      const [ear, ene] = await Promise.all([
        listEnterpriseActivity({ limit: 8 }),
        listEnterpriseNotifications({ limit: 40, unreadOnly: true }, user.id),
      ]);
      setItems(ear.slice(0, 8));
      setUnreadComms(
        ene.filter(
          (n) =>
            COMM_ENE_TYPES.has(String(n.eventType)) ||
            n.sourceSystem === "inbound_email",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void refresh();
    const id = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(id);
  }, [isAuthenticated, refresh]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  const unreadCount = unreadComms.length;

  const onOpenItem = async (event: EnterpriseActivityEvent) => {
    const href = activityHref(event);
    const sourceEventId = event.sourceEventId;
    const match = unreadComms.find(
      (n) =>
        n.sourceEventId === sourceEventId ||
        (typeof event.payload?.inboundEmailId === "string" &&
          n.href.includes(String(event.payload.inboundEmailId))),
    );
    if (match) {
      await markEnterpriseNotificationRead(match.id, user?.id);
    }
    setOpen(false);
    router.push(href);
  };

  const badgeLabel =
    unreadCount <= 0 ? null : unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative shrink-0"
          aria-label="Activity & Dialogue"
          title="Activity & Dialogue"
        >
          <MessagesSquare className="h-4 w-4" />
          {badgeLabel ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[9px] font-bold text-white">
              {badgeLabel}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <History className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <h4 className="text-sm font-semibold">Activity & Dialogue</h4>
          </div>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-800 dark:text-violet-200">
              {unreadCount} new
            </span>
          ) : null}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading && items.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">
              No recent activity yet.
            </p>
          ) : (
            items.map((event) => {
              const email = isIncomingEmail(event);
              const attention = needsAttention(event);
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => void onOpenItem(event)}
                  className={cn(
                    "flex w-full gap-3 border-b px-4 py-3 text-left last:border-0 transition-colors hover:bg-muted/50",
                    email && "bg-violet-500/5",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                      email
                        ? "bg-violet-500/15 text-violet-700 dark:text-violet-300"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {email ? (
                      <Mail className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <History className="h-3.5 w-3.5" aria-hidden />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {email ? (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                          New email
                        </span>
                      ) : null}
                      {attention ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                          Needs Attention
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-sm font-medium text-foreground">{event.title}</p>
                    {event.summary ? (
                      <p className="truncate text-xs text-muted-foreground">{event.summary}</p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatRelativeTime(event.occurredAt)}
                    </p>
                  </div>
                  {unreadComms.some((n) => n.sourceEventId === event.sourceEventId) ? (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet-600" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
        <div className="border-t px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-full text-xs"
            onClick={() => {
              setOpen(false);
              router.push(ROUTES.ACTIVITY);
            }}
          >
            Open Activity & Dialogue →
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
