/**
 * CO-GOV-001 — Authoritative business timeline projection (governance layer).
 * Composes entity changes, field audits, EDL rows, and ops audits for an entity.
 */

import { listEnterpriseDecisionsByEntity } from "@/lib/enterprise-decision-ledger";
import { listAudits } from "@/lib/ops/rings";
import { toAuditScalar } from "@/lib/ops/redact";
import type {
  GovernanceEntityType,
  GovernanceTimelineEvent,
} from "@/types/enterprise-governance";
import { listEntityChangesFor, listFieldAuditsFor } from "./rings";

export function buildEntityGovernanceTimeline(input: {
  entityType: GovernanceEntityType | string;
  entityId: string;
  limit?: number;
}): GovernanceTimelineEvent[] {
  const limit = input.limit ?? 100;
  const events: GovernanceTimelineEvent[] = [];

  for (const e of listEntityChangesFor(input.entityType, input.entityId, limit)) {
    events.push({
      id: `life-${e.id}`,
      at: e.at,
      kind: "lifecycle",
      title: `${e.entityType} ${e.action}`,
      summary: e.summary,
      entityType: e.entityType,
      entityId: e.entityId,
      actorUserId: e.actorUserId,
      correlationId: e.correlationId,
      previousValue: e.previousValue,
      newValue: e.newValue,
    });
  }

  for (const f of listFieldAuditsFor(input.entityType, input.entityId, limit)) {
    events.push({
      id: `field-${f.id}`,
      at: f.at,
      kind: "field",
      title: `${f.fieldName} changed`,
      summary: `${f.fieldName}: ${f.oldValue ?? "—"} → ${f.newValue ?? "—"}`,
      entityType: f.entityType,
      entityId: f.entityId,
      actorUserId: f.changedBy,
      correlationId: f.correlationId,
      previousValue: f.oldValue,
      newValue: f.newValue,
    });
  }

  try {
    const edl = listEnterpriseDecisionsByEntity(input.entityType, input.entityId);
    for (const d of edl.slice(0, limit)) {
      events.push({
        id: `edl-${d.ledgerId}`,
        at: d.recordedAt,
        kind:
          d.changeCategory === "user_role_changes" ||
          d.changeCategory === "permission_changes"
            ? "admin"
            : "configuration",
        title: `${d.changeCategory} · v${d.versionNumber}`,
        summary: d.businessJustification,
        entityType: d.relatedEntityType ?? input.entityType,
        entityId: d.relatedEntityId ?? input.entityId,
        actorUserId: d.implementedBy ?? d.approvedBy ?? d.requestedBy,
        previousValue: toAuditScalar(d.previousValue),
        newValue: toAuditScalar(d.newValue),
      });
    }
  } catch {
    /* EDL optional */
  }

  for (const a of listAudits(200)) {
    if (a.entityId !== input.entityId) continue;
    events.push({
      id: `ops-${a.id}`,
      at: a.at,
      kind: "ops",
      title: a.action,
      summary: `${a.module} · ${a.result}`,
      entityType: String(a.module),
      entityId: a.entityId,
      actorUserId: a.actorUserId,
      correlationId: a.correlationId,
      previousValue: a.previousValue,
      newValue: a.newValue,
    });
  }

  events.sort((x, y) => Date.parse(y.at) - Date.parse(x.at));

  // Dedupe near-identical titles at same second
  const seen = new Set<string>();
  const deduped: GovernanceTimelineEvent[] = [];
  for (const e of events) {
    const key = `${e.at.slice(0, 19)}|${e.title}|${e.summary}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(e);
    if (deduped.length >= limit) break;
  }
  return deduped;
}
