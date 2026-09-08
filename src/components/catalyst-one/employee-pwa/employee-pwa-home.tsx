"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuthContext } from "@/components/providers/auth-provider";
import { EmployeePwaRecordCard } from "@/components/catalyst-one/employee-pwa/employee-pwa-record-card";
import { getFullName } from "@/lib/permissions";
import { employeePwaJson } from "@/lib/employee-pwa/api";
import {
  formatEmployeePwaAmount,
  formatEmployeePwaDate,
  formatEmployeePwaLastAction,
  formatEmployeePwaSourceIdentity,
} from "@/lib/employee-pwa/source-identity";
import { listEteTasks } from "@/lib/enterprise-task-engine";
import { sameAssigneeRef } from "@/lib/enterprise-task-engine/my-work";
import { deriveEteTaskColour } from "@/lib/enterprise-task-engine";
import { EMPLOYEE_PWA_CREATE_ACTIONS, EMPLOYEE_PWA_LIST_ORDER } from "@/constants/employee-pwa";
import { Button } from "@/components/ui/button";

type OpportunityRow = {
  id: string;
  primaryContactName?: string | null;
  companyName?: string | null;
  productLabel?: string | null;
  requestedAmount?: number | null;
  currencyCode?: string | null;
  sourceCode?: string | null;
  sourceContactName?: string | null;
  relationshipManagerName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type NotificationRow = {
  id: string;
  title?: string;
  body?: string;
  readAt?: string | null;
  href?: string | null;
  createdAt?: string;
};

export function EmployeePwaHome() {
  const { user } = useAuthContext();
  const [opportunities, setOpportunities] = useState<OpportunityRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [error, setError] = useState("");
  const [inboundCount, setInboundCount] = useState(0);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    return `${hello}, ${user ? getFullName(user) : "there"}`;
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const opp = await employeePwaJson<{ items?: OpportunityRow[] }>(
          `/api/enterprise-opportunities?${EMPLOYEE_PWA_LIST_ORDER.opportunityQuery}&limit=8`,
        );
        const notes = await employeePwaJson<{ items?: NotificationRow[] }>(
          "/api/enterprise-notifications?unreadOnly=1&limit=8",
        );
        if (cancelled) return;
        const items = opp.items ?? [];
        setOpportunities(items);
        setNotifications(notes.items ?? []);
        if (items.length) {
          const ids = items.map((row) => row.id).join(",");
          const inbound = await employeePwaJson<{ count?: number }>(
            `/api/document-workspace/refinement-014?view=inbound-new-summary&opportunityIds=${encodeURIComponent(ids)}`,
          );
          if (!cancelled) setInboundCount(Number(inbound.count || 0));
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load Home.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const myTasks = listEteTasks().filter((task) =>
    user ? sameAssigneeRef(task.assigneeRef, user.id) && task.enabled !== false && task.status === "open" : false,
  );
  const overdue = myTasks.filter((task) => deriveEteTaskColour(task.dueOn) === "red");

  return (
    <div data-employee-pwa-home="true" className="space-y-4">
      <header>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Catalyst One</p>
        <h1 className="text-xl font-semibold">{greeting}</h1>
        <p className="text-xs text-muted-foreground">Personal operational dashboard · newest work first</p>
      </header>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border bg-card p-3 text-xs">
          <p className="text-muted-foreground">Priority tasks</p>
          <p className="text-lg font-semibold">{myTasks.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-xs">
          <p className="text-muted-foreground">Overdue / SLA</p>
          <p className="text-lg font-semibold">{overdue.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-xs">
          <p className="text-muted-foreground">Unread alerts</p>
          <p className="text-lg font-semibold">{notifications.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-xs">
          <p className="text-muted-foreground">New from Email</p>
          <p className="text-lg font-semibold">{inboundCount}</p>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Quick actions</h2>
        <div className="flex flex-wrap gap-2">
          {EMPLOYEE_PWA_CREATE_ACTIONS.map((action) => (
            <Button key={action.id} asChild size="sm" variant="outline" className="min-h-11">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ))}
          <Button asChild size="sm" variant="outline" className="min-h-11">
            <Link href="/pwa/chanakya">Ask CHANAKYA</Link>
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Newest Opportunities</h2>
          <Link className="text-xs text-primary" href="/pwa/work/opportunities">
            View all
          </Link>
        </div>
        {opportunities.map((row) => (
          <EmployeePwaRecordCard
            key={row.id}
            href={`/pwa/work/opportunities/${row.id}`}
            title={row.primaryContactName || row.companyName || "Opportunity"}
            lines={[
              row.productLabel || "Product not specified",
              formatEmployeePwaAmount(row.requestedAmount, row.currencyCode || "INR"),
              formatEmployeePwaSourceIdentity(row),
              `Created ${formatEmployeePwaDate(row.createdAt)}`,
              formatEmployeePwaLastAction({ updatedAt: row.updatedAt }),
            ]}
          />
        ))}
        {!opportunities.length ? <p className="text-xs text-muted-foreground">No Opportunities yet.</p> : null}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent notifications</h2>
          <Link className="text-xs text-primary" href="/pwa/work/notifications">
            Centre
          </Link>
        </div>
        {notifications.slice(0, 5).map((note) => (
          <EmployeePwaRecordCard
            key={note.id}
            href={note.href?.startsWith("/") ? `/pwa/work/notifications` : "/pwa/work/notifications"}
            title={note.title || "Notification"}
            lines={[note.body || "CHANAKYA alert", formatEmployeePwaDate(note.createdAt)]}
            badge="Unread"
          />
        ))}
      </section>
    </div>
  );
}
