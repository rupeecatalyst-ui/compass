/**
 * CO-GOV-001 — Compliance readiness assessment (governance layer).
 */

import { getEdlRegistrySnapshot, listEnterpriseDecisions } from "@/lib/enterprise-decision-ledger";
import { listAudits } from "@/lib/ops/rings";
import type { GovernanceComplianceAssessment } from "@/types/enterprise-governance";
import { listEntityChanges, listFieldAudits } from "./rings";

export function assessGovernanceCompliance(): GovernanceComplianceAssessment {
  const asOf = new Date().toISOString();
  const edl = getEdlRegistrySnapshot();
  const decisions = listEnterpriseDecisions();
  const changes = listEntityChanges(200);
  const fields = listFieldAudits(200);
  const ops = listAudits(200);

  const entityTypes = new Set(changes.map((c) => c.entityType));
  const expectedEntities = [
    "Contact",
    "EnterpriseDeal",
    "Document",
    "Workflow",
    "Lender",
    "Configuration",
    "Role",
  ];
  const coveredExpected = expectedEntities.filter((e) => entityTypes.has(e as never)).length;
  const entityCoverage = Math.round((coveredExpected / expectedEntities.length) * 100);

  const hasRoleEdl = decisions.some(
    (d) =>
      d.changeCategory === "user_role_changes" || d.changeCategory === "permission_changes",
  );
  const hasConfigEdl = decisions.some((d) =>
    [
      "credit_policies",
      "product_rules",
      "workflow_configuration",
      "organization_settings",
      "enterprise_engine_configuration",
      "experience_console_changes",
    ].includes(d.changeCategory),
  );

  const auditCompleteness = Math.min(
    100,
    Math.round(
      (Math.min(ops.length, 20) / 20) * 35 +
        (Math.min(changes.length, 20) / 20) * 35 +
        (Math.min(fields.length, 10) / 10) * 15 +
        (edl.entryCount > 0 ? 15 : 0),
    ),
  );

  const dimensions = [
    {
      id: "entity-history",
      label: "Entity change history",
      status: (changes.length > 0 ? "partial" : "gap") as "ready" | "partial" | "gap",
      score: Math.min(10, Math.round((changes.length / 10) * 10) || (changes.length > 0 ? 6 : 3)),
      notes:
        "Lifecycle events mirrored from ops + governance recorders (process-local ring).",
    },
    {
      id: "field-audit",
      label: "Field-level audit",
      status: (fields.length > 0 ? "partial" : "gap") as "ready" | "partial" | "gap",
      score: fields.length > 0 ? 7 : 4,
      notes: "Important fields (amount, stage, RM, product, status) supported via recordFieldAudit.",
    },
    {
      id: "timeline",
      label: "Enterprise timeline",
      status: "partial" as const,
      score: 7,
      notes: "Governance timeline facade composes lifecycle, fields, EDL, and ops audits.",
    },
    {
      id: "admin-governance",
      label: "Administrative traceability",
      status: (hasRoleEdl || edl.entryCount > 0 ? "partial" : "gap") as "ready" | "partial" | "gap",
      score: hasRoleEdl ? 8 : edl.entryCount > 0 ? 7 : 5,
      notes: "EDL remains constitutional store for admin/config decisions.",
    },
    {
      id: "config-versioning",
      label: "Configuration versioning",
      status: (hasConfigEdl ? "partial" : "gap") as "ready" | "partial" | "gap",
      score: hasConfigEdl ? 8 : 5,
      notes: "publishConfigurationVersion + existing CRE/ECG/Product EDL emitters.",
    },
    {
      id: "export",
      label: "Governance export",
      status: "ready" as const,
      score: 8,
      notes: "CSV exports via /api/admin/governance/export.",
    },
    {
      id: "retention",
      label: "Data retention",
      status: "gap" as const,
      score: 4,
      notes: "Rings are instance-local; durable retention policy not yet formalized.",
    },
    {
      id: "accountability",
      label: "User accountability",
      status: "partial" as const,
      score: 8,
      notes: "Actor user IDs on audits, EDL, and field changes; correlation IDs from CO-OPS-002.",
    },
  ];

  const avgDim =
    dimensions.reduce((s, d) => s + d.score, 0) / Math.max(1, dimensions.length);
  const complianceReadiness = Math.round(
    avgDim * 10 * 0.5 + auditCompleteness * 0.3 + entityCoverage * 0.2,
  );
  const overallScore = Math.round((avgDim / 10) * 100) / 10;

  const remainingGaps = [
    "Durable EDL / governance store (Prisma ports) for multi-instance retention",
    "Opportunity and Accounting entry writers not fully emitting field history",
    "Formal data retention & legal hold policy still pending",
    "Deal Prisma timeline remains complementary — not replaced by governance ring",
    ...(hasRoleEdl ? [] : ["Role/permission EDL emissions depend on RPE admin actions occurring"]),
  ];

  const recommendations = [
    "Configure EDL Prisma adapter (configureEdlPorts) for constitutional durability",
    "Expand field-diff audits on Opportunity and Accounting posting paths",
    "Define retention windows (e.g. 7 years for financial audit trails)",
    "Ship SIEM/log drain indexing correlationId + ledgerId",
    "Add scheduled governance export to secure object storage",
  ];

  return {
    asOf,
    overallScore,
    auditCompleteness,
    entityCoverage,
    complianceReadiness,
    dimensions,
    remainingGaps,
    recommendations,
    summary:
      overallScore >= 7.5
        ? "Governance foundation is suitable for Catalyst One v1.x with known durability gaps."
        : "Governance foundation is partial — prioritize durable ledger and remaining entity emitters.",
  };
}
