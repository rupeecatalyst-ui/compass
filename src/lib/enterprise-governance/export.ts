/**
 * CO-GOV-001 — CSV export builders for governance reports (Excel-compatible).
 */

import { listEnterpriseDecisions } from "@/lib/enterprise-decision-ledger";
import { listAudits } from "@/lib/ops/rings";
import type { GovernanceExportKind } from "@/types/enterprise-governance";
import { listEntityChanges, listFieldAudits } from "./rings";

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((r) => r.map(csvEscape).join(",")),
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function buildGovernanceExportCsv(
  kind: GovernanceExportKind,
  limit = 500,
): { filename: string; contentType: string; body: string } {
  const stamp = new Date().toISOString().slice(0, 10);

  if (kind === "change_history" || kind === "full_pack") {
    const rows = listEntityChanges(limit).map((e) => [
      e.at,
      e.entityType,
      e.entityId,
      e.action,
      e.actorUserId,
      e.summary,
      e.previousValue,
      e.newValue,
      e.reason,
      e.correlationId,
    ]);
    const changeCsv = toCsv(
      [
        "Changed At",
        "Entity Type",
        "Entity ID",
        "Action",
        "Changed By",
        "Summary",
        "Previous Value",
        "New Value",
        "Reason",
        "Correlation ID",
      ],
      rows,
    );
    if (kind === "change_history") {
      return {
        filename: `governance-change-history-${stamp}.csv`,
        contentType: "text/csv;charset=utf-8",
        body: changeCsv,
      };
    }
  }

  if (kind === "field_audit") {
    const rows = listFieldAudits(limit).map((f) => [
      f.changedAt,
      f.entityType,
      f.entityId,
      f.fieldName,
      f.oldValue,
      f.newValue,
      f.changedBy,
      f.reason,
      f.correlationId,
    ]);
    return {
      filename: `governance-field-audit-${stamp}.csv`,
      contentType: "text/csv;charset=utf-8",
      body: toCsv(
        [
          "Changed At",
          "Entity Type",
          "Entity ID",
          "Field Name",
          "Old Value",
          "New Value",
          "Changed By",
          "Reason",
          "Correlation ID",
        ],
        rows,
      ),
    };
  }

  if (kind === "user_activity" || kind === "audit_trail") {
    const rows = listAudits(limit).map((a) => [
      a.at,
      a.actorUserId,
      a.module,
      a.action,
      a.entityId,
      a.result,
      a.previousValue,
      a.newValue,
      a.correlationId,
    ]);
    return {
      filename: `governance-${kind.replace(/_/g, "-")}-${stamp}.csv`,
      contentType: "text/csv;charset=utf-8",
      body: toCsv(
        [
          "At",
          "User ID",
          "Module",
          "Action",
          "Entity ID",
          "Result",
          "Previous Value",
          "New Value",
          "Correlation ID",
        ],
        rows,
      ),
    };
  }

  if (kind === "administrative_changes") {
    const rows = listEnterpriseDecisions()
      .slice(0, limit)
      .map((d) => [
        d.recordedAt,
        d.ledgerId,
        d.changeCategory,
        d.changeType,
        d.versionNumber,
        d.requestedBy,
        d.approvedBy,
        d.implementedBy,
        d.relatedEntityType,
        d.relatedEntityId,
        d.effectiveFrom,
        d.businessJustification,
        typeof d.previousValue === "string"
          ? d.previousValue
          : JSON.stringify(d.previousValue)?.slice(0, 240),
        typeof d.newValue === "string"
          ? d.newValue
          : JSON.stringify(d.newValue)?.slice(0, 240),
      ]);
    return {
      filename: `governance-administrative-changes-${stamp}.csv`,
      contentType: "text/csv;charset=utf-8",
      body: toCsv(
        [
          "Recorded At",
          "Ledger ID",
          "Category",
          "Change Type",
          "Version",
          "Requested By",
          "Approved By",
          "Implemented By",
          "Entity Type",
          "Entity ID",
          "Effective From",
          "Justification",
          "Previous Value",
          "New Value",
        ],
        rows,
      ),
    };
  }

  // full_pack — concatenate sections with markers
  const sections = [
    "=== CHANGE HISTORY ===",
    buildGovernanceExportCsv("change_history", limit).body,
    "=== FIELD AUDIT ===",
    buildGovernanceExportCsv("field_audit", limit).body,
    "=== USER ACTIVITY ===",
    buildGovernanceExportCsv("user_activity", limit).body,
    "=== ADMINISTRATIVE CHANGES ===",
    buildGovernanceExportCsv("administrative_changes", limit).body,
  ];
  return {
    filename: `governance-full-pack-${stamp}.csv`,
    contentType: "text/csv;charset=utf-8",
    body: sections.join("\r\n"),
  };
}
