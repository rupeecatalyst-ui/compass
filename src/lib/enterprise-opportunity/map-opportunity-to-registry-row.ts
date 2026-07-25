/**
 * Map Enterprise Opportunity API → OpportunityRegistryRow.
 */
import type { EnterpriseOpportunityApiRecord } from "@/lib/enterprise-opportunity/opportunity-api-client";
import { coalesceAssignedUsers, formatAssignedUsersLabel } from "@/lib/assigned-users";
import type { OpportunityRegistryRow } from "@/types/opportunity-registry";

/** Enterprise list timestamp — e.g. 05 Jul 2026, 10:42 AM */
function formatWhenTime(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const datePart = d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timePart = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${datePart}, ${timePart}`;
  } catch {
    return iso;
  }
}

function humanize(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  return value.trim().replace(/_/g, " ");
}

export function mapEnterpriseOpportunityToRegistryRow(
  opp: EnterpriseOpportunityApiRecord,
): OpportunityRegistryRow {
  const stage = opp.requirementStage || "—";
  const status = opp.lifecycleStatus || "—";
  const assignedUsers = coalesceAssignedUsers({
    lendingExtension: opp.lendingExtension,
    primaryOwnerUserId: opp.primaryOwnerUserId,
    relationshipManagerUserId: opp.relationshipManagerUserId,
    relationshipManagerName: opp.relationshipManagerName,
  });
  const owner = formatAssignedUsersLabel(assignedUsers);

  return {
    id: opp.id,
    opportunityNumber: opp.opportunityNumber,
    legacyLoanFileId: opp.legacyLoanFileId ?? null,
    customerName: opp.primaryContactName?.trim() || "—",
    product: opp.productLabel?.trim() || humanize(opp.productFamily) || "—",
    opportunityStage: stage,
    opportunityStageLabel: humanize(stage),
    owner,
    assignedUsers,
    rowVersion: opp.rowVersion,
    lendingExtension:
      opp.lendingExtension && typeof opp.lendingExtension === "object"
        ? (opp.lendingExtension as Record<string, unknown>)
        : null,
    createdAt: opp.createdAt || "",
    createdAtLabel: formatWhenTime(opp.createdAt || ""),
    updatedAt: opp.updatedAt || opp.createdAt || "",
    updatedAtLabel: formatWhenTime(opp.updatedAt || opp.createdAt || ""),
    status,
    statusLabel: humanize(status),
    fulfilmentStatus: opp.fulfilmentStatus || "—",
    primaryContactId: opp.primaryContactId,
    requestedAmount: opp.requestedAmount ?? null,
  };
}
