"use client";

/**
 * Header Notifications — ENE general (non-communication) unread items.
 * Communication alerts live in Activity & Dialogue quick access.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { EmptyState } from "@/components/design-system/empty-state";
import { StatusPill } from "@/components/design-system/status-pill";
import { useAuthContext } from "@/components/providers/auth-provider";
import {
  listEnterpriseNotifications,
  markEnterpriseNotificationRead,
} from "@/lib/enterprise-notification-engine";
import type { EnterpriseNotificationItem } from "@/types/enterprise-notification-engine";
import { formatRelativeTime } from "@/lib/utils";

const COMM_ENE_TYPES = new Set([
  "CUSTOMER_EMAIL_RECEIVED",
  "CUSTOMER_EMAIL_ATTACHMENT_RECEIVED",
  "TRANSACTION_EMAIL_SENT",
  "TRANSACTION_EMAIL_FAILED",
]);

function isGeneralNotification(n: EnterpriseNotificationItem): boolean {
  if (n.sourceSystem === "inbound_email") return false;
  if (COMM_ENE_TYPES.has(String(n.eventType))) return false;
  return true;
}

export function NotificationsPanel() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthContext();
  const [items, setItems] = useState<EnterpriseNotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const all = await listEnterpriseNotifications({ limit: 30 }, user.id);
      setItems(all.filter(isGeneralNotification).slice(0, 20));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const unread = items.filter((n) => n.readState === "UNREAD");

  if (!isAuthenticated) {
    return (
      <div className="p-4">
        <EmptyState icon={Bell} title="Sign in required" description="Notifications appear after login." />
      </div>
    );
  }

  if (loading && items.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-muted-foreground">Loading notifications…</div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="System updates appear here. Communication alerts are under Activity & Dialogue."
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h4 className="text-sm font-semibold">Notifications</h4>
        {unread.length > 0 ? (
          <StatusPill variant="info">{unread.length} new</StatusPill>
        ) : null}
      </div>
      <div className="max-h-80 overflow-y-auto">
        {items.map((notification) => (
          <button
            key={notification.id}
            type="button"
            className="flex w-full gap-3 border-b px-4 py-3 text-left last:border-0 transition-colors hover:bg-muted/50"
            onClick={async () => {
              if (notification.readState === "UNREAD") {
                await markEnterpriseNotificationRead(notification.id, user?.id);
              }
              if (notification.href) router.push(notification.href);
            }}
          >
            {notification.readState === "UNREAD" ? (
              <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
            ) : (
              <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-transparent" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{notification.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {notification.description || notification.body}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatRelativeTime(notification.occurredAt)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
