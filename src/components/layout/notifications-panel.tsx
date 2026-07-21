"use client";

import { Bell } from "lucide-react";
import { EmptyState } from "@/components/design-system/empty-state";
import { StatusPill } from "@/components/design-system/status-pill";
import { formatRelativeTime } from "@/lib/utils";
import { isDemoSeedEnabled } from "@/lib/demo-seed";
import type { Notification } from "@/types/navigation";

const mockNotifications: Notification[] = [
  {
    id: "1",
    title: "Welcome to COMPASS",
    description: "Your financial operating system is ready.",
    read: false,
    createdAt: new Date().toISOString(),
    type: "success",
  },
  {
    id: "2",
    title: "Platform foundation complete",
    description: "Sprint 1 architecture is deployed.",
    read: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    type: "info",
  },
];

export function NotificationsPanel() {
  const notifications = isDemoSeedEnabled() ? mockNotifications : [];

  if (notifications.length === 0) {
    return (
      <div className="p-4">
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up." />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h4 className="text-sm font-semibold">Notifications</h4>
        <StatusPill variant="info">{notifications.filter((n) => !n.read).length} new</StatusPill>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="flex gap-3 border-b px-4 py-3 last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{notification.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{notification.description}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(notification.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
