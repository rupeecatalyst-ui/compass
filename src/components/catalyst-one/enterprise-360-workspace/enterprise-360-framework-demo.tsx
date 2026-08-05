"use client";

/**
 * CO-360-001 — Admin framework demo (BAT). Not a primary-nav operational cutover.
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Enterprise360Workspace } from "@/components/catalyst-one/enterprise-360-workspace/enterprise-360-workspace";
import {
  ENTERPRISE_360_ENTITY_KINDS,
  ENTERPRISE_360_PRINCIPLES,
  getEnterprise360Module,
} from "@/constants/enterprise-360-workspace";
import {
  composeContactIdentityRoleLinks,
  composeEnterprise360Workspace,
  createEnterprise360AuditEntry,
  createEnterprise360TimelineEvent,
  listEnterprise360FrameworkInventory,
} from "@/lib/enterprise-360-workspace";
import type { Enterprise360EntityKind } from "@/types/enterprise-360-workspace";
import { cn } from "@/lib/utils";

const DEMO_LABELS: Record<Enterprise360EntityKind, string> = {
  customer: "Demo Customer — Rajesh Kumar",
  lender: "Demo Lender — HDFC Bank",
  wealth_partner: "Demo Wealth Partner — Apex Advisors",
  vendor: "Demo Vendor — Legal Associates LLP",
  employee: "Demo Employee — Priya Sharma",
  contact: "Demo Contact — Anil Mehta",
};

export function Enterprise360FrameworkDemo({
  initialKind = "customer",
}: {
  initialKind?: Enterprise360EntityKind;
}) {
  const [kind, setKind] = useState<Enterprise360EntityKind>(initialKind);
  const inventory = useMemo(() => listEnterprise360FrameworkInventory(), []);

  const snapshot = useMemo(() => {
    const moduleDef = getEnterprise360Module(kind);
    return composeEnterprise360Workspace({
      entityKind: kind,
      entityId: `demo-${kind}`,
      entityLabel: DEMO_LABELS[kind],
      currentStatus: "Active",
      pendingActions: 2,
      openTasks: 3,
      upcomingActivities: 1,
      complianceAlerts: kind === "wealth_partner" ? 1 : 0,
      documentsPending: 1,
      timeline: [
        createEnterprise360TimelineEvent({
          event: "created",
          detail: `${moduleDef.label} framework surface initialised`,
          actorUserId: "system",
        }),
        createEnterprise360TimelineEvent({
          event: "updated",
          detail: "Executive dashboard composed from entity signals",
          actorUserId: "system",
        }),
      ],
      audit: [
        createEnterprise360AuditEntry({
          action: "framework_compose",
          userId: "system",
          oldValue: null,
          newValue: kind,
        }),
      ],
      identityRoles:
        kind === "contact"
          ? composeContactIdentityRoleLinks({
              contactId: "demo-contact",
              assignedRoleIds: ["customer", "guarantor"],
              wealthPartnerId: null,
            })
          : undefined,
      aiSummaryOverride: undefined,
    });
  }, [kind]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground">CO-360-001 Framework Demo</p>
        <p className="mt-1">
          Registries remain SSOT. This Admin surface certifies the Universal 360° engine —
          not a primary-nav cutover of live entity desks.
        </p>
        <ul className="mt-2 list-inside list-disc space-y-0.5">
          {ENTERPRISE_360_PRINCIPLES.slice(0, 4).map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ENTERPRISE_360_ENTITY_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-[11px] font-medium",
              kind === k
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {getEnterprise360Module(k).label}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {inventory.map((row) => (
          <div
            key={row.kind}
            className="rounded-md border px-2.5 py-2 text-[11px] text-muted-foreground"
          >
            <p className="font-medium text-foreground">{row.label}</p>
            <p>
              {row.sectionCount} sections · {row.commandCount} commands · AI: {row.aiFocus}
            </p>
          </div>
        ))}
      </div>

      <Enterprise360Workspace
        snapshot={snapshot}
        onCommand={(id) =>
          toast.message("360 Command", {
            description: `${id.replace(/_/g, " ")} — wired by entity adapters (framework demo).`,
          })
        }
      />
    </div>
  );
}
