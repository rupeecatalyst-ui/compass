"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { employeePwaJson } from "@/lib/employee-pwa/api";
import { formatEmployeePwaDate } from "@/lib/employee-pwa/source-identity";
import { EMPLOYEE_PWA_PUSH_DISABLED_MESSAGE } from "@/constants/employee-pwa";
import { employeePwaPushStatus } from "@/lib/employee-pwa/push";

type NotificationRow = {
  id: string;
  title?: string;
  body?: string;
  href?: string | null;
  createdAt?: string;
  readAt?: string | null;
};

function pwaDeepLink(href?: string | null): string {
  if (!href) return "/pwa/work/notifications";
  if (href.startsWith("/pwa")) return href;
  if (href.startsWith("/opportunities") || href.includes("opportunity")) return "/pwa/work/opportunities";
  if (href.startsWith("/deals") || href.startsWith("/my-deals")) return "/pwa/work/deals";
  if (href.startsWith("/tasks")) return "/pwa/work/tasks";
  if (href.startsWith("/document")) return "/pwa/work/documents";
  if (href.startsWith("/mission-control")) return "/pwa/work/mission-control";
  return "/pwa";
}

export function EmployeePwaNotifications() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [error, setError] = useState("");
  const push = employeePwaPushStatus();

  const load = () =>
    employeePwaJson<{ items?: NotificationRow[] }>("/api/enterprise-notifications?limit=40")
      .then((data) => setItems(data.items ?? []))
      .catch((err: Error) => setError(err.message));

  useEffect(() => {
    void load();
  }, []);

  const unread = items.filter((item) => !item.readAt).length;

  return (
    <div data-employee-pwa-notifications="true" className="space-y-3">
      <h1 className="text-xl font-semibold">Notifications</h1>
      <p className="text-xs text-muted-foreground">Unread: {unread}</p>
      <p className="text-xs text-muted-foreground">{push.configurationRequired ? EMPLOYEE_PWA_PUSH_DISABLED_MESSAGE : null}</p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {items.map((item) => (
        <div key={item.id} className="rounded-xl border p-3">
          <p className="text-sm font-medium">{item.title}</p>
          <p className="text-xs text-muted-foreground">{item.body}</p>
          <p className="text-[11px] text-muted-foreground">{formatEmployeePwaDate(item.createdAt)}</p>
          <div className="mt-2 flex gap-2">
            <Button asChild size="sm" className="min-h-11">
              <Link href={pwaDeepLink(item.href)}>Open</Link>
            </Button>
            {!item.readAt ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-11"
                onClick={() =>
                  void employeePwaJson(`/api/enterprise-notifications/${item.id}`, {
                    method: "POST",
                    body: JSON.stringify({ action: "mark_read" }),
                  }).then(() => load())
                }
              >
                Mark read
              </Button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
