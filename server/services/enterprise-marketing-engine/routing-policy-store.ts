/**
 * CO-MARKETING-MKT-11 — Configurable routing policies (no hardcoded employee).
 */

import type { MarketingRoutingMode } from "@/lib/enterprise-marketing-engine/ports/routing.port";
import type { MarketingRoutingPolicy } from "@/types/enterprise-marketing-qualification";

const policies = new Map<string, MarketingRoutingPolicy>();
let seq = 0;

function nowIso() {
  return new Date().toISOString();
}

export const marketingRoutingPolicyStore = {
  list(organizationId: string): MarketingRoutingPolicy[] {
    return [...policies.values()]
      .filter((p) => p.organizationId === organizationId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  get(id: string): MarketingRoutingPolicy | null {
    return policies.get(id) ?? null;
  },

  getForOrg(id: string, organizationId: string): MarketingRoutingPolicy | null {
    const p = policies.get(id);
    if (!p || p.organizationId !== organizationId) return null;
    return p;
  },

  upsert(input: {
    id?: string;
    organizationId: string;
    name: string;
    mode: MarketingRoutingMode;
    assigneeUserId?: string | null;
    teamId?: string | null;
    members?: MarketingRoutingPolicy["members"];
    rules?: MarketingRoutingPolicy["rules"];
    fallbackAssigneeUserId?: string | null;
    rrCursor?: number;
    territoryField?: "city" | "territory";
  }): MarketingRoutingPolicy {
    const ts = nowIso();
    const id = input.id?.trim() || `mkt-route-${++seq}`;
    const prev = policies.get(id);
    const next: MarketingRoutingPolicy = {
      id,
      organizationId: input.organizationId,
      name: input.name.trim() || "Routing policy",
      mode: input.mode,
      assigneeUserId: input.assigneeUserId ?? prev?.assigneeUserId ?? null,
      teamId: input.teamId ?? prev?.teamId ?? null,
      members: input.members ?? prev?.members ?? [],
      rules: input.rules ?? prev?.rules ?? [],
      fallbackAssigneeUserId:
        input.fallbackAssigneeUserId ?? prev?.fallbackAssigneeUserId ?? null,
      rrCursor: input.rrCursor ?? prev?.rrCursor ?? 0,
      territoryField: input.territoryField ?? prev?.territoryField ?? "city",
      createdAt: prev?.createdAt ?? ts,
      updatedAt: ts,
    };
    policies.set(id, next);
    return next;
  },

  advanceCursor(id: string, nextCursor: number): void {
    const p = policies.get(id);
    if (!p) return;
    policies.set(id, { ...p, rrCursor: nextCursor, updatedAt: nowIso() });
  },

  resetOrganization(organizationId: string) {
    for (const [id, p] of [...policies.entries()]) {
      if (p.organizationId === organizationId) policies.delete(id);
    }
  },
};
