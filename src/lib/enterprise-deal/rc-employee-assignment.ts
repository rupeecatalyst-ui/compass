/**
 * Canonical Rupee Catalyst employee assignment for Opportunity → Deal.
 * Inheritance vs Deal override. Pure helpers — no Prisma, no network.
 */

import {
  GENERIC_RC_EMPLOYEE_NAME_PATTERN,
  RC_EMPLOYEE_ASSIGNMENT_SOURCE_KEY,
  RC_EMPLOYEE_ASSIGNMENT_SOURCES,
  type RcEmployeeAssignmentSource,
} from "@/constants/enterprise-deal/rc-employee-assignment";
import {
  buildAssignmentPatch,
  coalesceAssignedUsers,
  writeAssignedUsersIntoExtension,
  type AssignedUserRef,
} from "@/lib/assigned-users";

export type { RcEmployeeAssignmentSource };

export type RcEmployeeSubject = {
  relationshipManagerUserId?: string | null;
  relationshipManagerName?: string | null;
  primaryOwnerUserId?: string | null;
  createdBy?: string | null;
  assignmentMode?: string | null;
  lendingExtension?: unknown;
};

export type RcEmployeeResolved = {
  userId: string | null;
  name: string | null;
  source: RcEmployeeAssignmentSource;
  assignedUsers: AssignedUserRef[];
};

export type RcEmployeeReconcileClass =
  | "ok-inherited"
  | "ok-override"
  | "ok-unassigned"
  | "needs-inherit";

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function isGenericRcEmployeeName(name: string | null | undefined): boolean {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return true;
  return GENERIC_RC_EMPLOYEE_NAME_PATTERN.test(trimmed);
}

export function isPlaceholderRcEmployee(input: {
  userId?: string | null;
  name?: string | null;
}): boolean {
  const id = input.userId?.trim() || "";
  if (id) return false;
  return isGenericRcEmployeeName(input.name);
}

export function readRcEmployeeAssignmentSource(
  input: Pick<RcEmployeeSubject, "assignmentMode" | "lendingExtension">,
): RcEmployeeAssignmentSource | null {
  const mode = (input.assignmentMode ?? "").trim().toLowerCase();
  if ((RC_EMPLOYEE_ASSIGNMENT_SOURCES as readonly string[]).includes(mode)) {
    return mode as RcEmployeeAssignmentSource;
  }
  const ext = asRecord(input.lendingExtension)[RC_EMPLOYEE_ASSIGNMENT_SOURCE_KEY];
  if (typeof ext === "string") {
    const normalized = ext.trim().toLowerCase();
    if ((RC_EMPLOYEE_ASSIGNMENT_SOURCES as readonly string[]).includes(normalized)) {
      return normalized as RcEmployeeAssignmentSource;
    }
  }
  return null;
}

export function isDealRcEmployeeOverride(input: Pick<RcEmployeeSubject, "assignmentMode" | "lendingExtension">): boolean {
  return readRcEmployeeAssignmentSource(input) === "override";
}

export function resolveRcEmployee(subject: RcEmployeeSubject): {
  userId: string | null;
  name: string | null;
  assignedUsers: AssignedUserRef[];
} {
  const assignedUsers = coalesceAssignedUsers({
    lendingExtension: subject.lendingExtension,
    primaryOwnerUserId: subject.primaryOwnerUserId,
    relationshipManagerUserId: subject.relationshipManagerUserId,
    relationshipManagerName: subject.relationshipManagerName,
  });
  const primary =
    assignedUsers.find((u) => u.isPrimaryOwner) ?? assignedUsers[0] ?? null;
  const userId =
    primary?.id?.trim() ||
    subject.relationshipManagerUserId?.trim() ||
    subject.primaryOwnerUserId?.trim() ||
    null;
  const name =
    primary?.name?.trim() ||
    subject.relationshipManagerName?.trim() ||
    null;
  if (isPlaceholderRcEmployee({ userId, name })) {
    return { userId: null, name: null, assignedUsers: [] };
  }
  return {
    userId,
    name: name || null,
    assignedUsers:
      assignedUsers.length > 0
        ? assignedUsers
        : userId && name
          ? [{ id: userId, name, isPrimaryOwner: true }]
          : [],
  };
}

export function stampRcEmployeeExtension(
  lendingExtension: unknown,
  employee: { userId: string; name: string; assignedUsers?: AssignedUserRef[] },
  source: RcEmployeeAssignmentSource,
  hierarchyVisibilityUserIds?: string[],
): Record<string, unknown> {
  const assigned =
    employee.assignedUsers && employee.assignedUsers.length > 0
      ? employee.assignedUsers
      : [{ id: employee.userId, name: employee.name, isPrimaryOwner: true }];
  const next = writeAssignedUsersIntoExtension(lendingExtension, assigned, {
    primaryOwnerUserId: employee.userId,
    hierarchyVisibilityUserIds,
  });
  next[RC_EMPLOYEE_ASSIGNMENT_SOURCE_KEY] = source;
  return next;
}

export function clearRcEmployeeOverrideMarker(lendingExtension: unknown): Record<string, unknown> {
  const next = { ...asRecord(lendingExtension) };
  next[RC_EMPLOYEE_ASSIGNMENT_SOURCE_KEY] = "inherited";
  return next;
}

/**
 * Incoming Deal create must not let the acting user / generic labels replace
 * an Opportunity-assigned RC employee.
 */
export function resolveCreateDealRcEmployee(input: {
  opportunity: RcEmployeeSubject;
  incoming?: RcEmployeeSubject | null;
  actorUserId?: string | null;
}): RcEmployeeResolved {
  const opportunity = resolveRcEmployee(input.opportunity);
  const incoming = input.incoming ? resolveRcEmployee(input.incoming) : { userId: null, name: null, assignedUsers: [] };
  const actorId = input.actorUserId?.trim() || "";

  if (opportunity.userId) {
    const incomingIsActorDefault =
      incoming.userId &&
      actorId &&
      incoming.userId === actorId &&
      incoming.userId !== opportunity.userId;
    const incomingIsPlaceholder = !incoming.userId;
    if (incomingIsPlaceholder || incomingIsActorDefault) {
      return { ...opportunity, source: "inherited" };
    }
    if (incoming.userId === opportunity.userId) {
      return { ...opportunity, source: "inherited" };
    }
    return {
      userId: incoming.userId,
      name: incoming.name,
      assignedUsers: incoming.assignedUsers.length ? incoming.assignedUsers : opportunity.assignedUsers,
      source: "override",
    };
  }

  if (incoming.userId) {
    return { ...incoming, source: incoming.userId === actorId ? "inherited" : "override" };
  }

  return { userId: null, name: null, assignedUsers: [], source: "inherited" };
}

export function classifyDealRcEmployeeReconcile(input: {
  deal: RcEmployeeSubject;
  opportunity: RcEmployeeSubject;
}): RcEmployeeReconcileClass {
  const opportunity = resolveRcEmployee(input.opportunity);
  const deal = resolveRcEmployee(input.deal);
  const declared = readRcEmployeeAssignmentSource(input.deal);

  if (declared === "override") return "ok-override";
  if (!opportunity.userId) {
    return deal.userId ? "ok-override" : "ok-unassigned";
  }
  if (!deal.userId) return "needs-inherit";
  if (deal.userId === opportunity.userId) return "ok-inherited";
  return "needs-inherit";
}

export function shouldPropagateOpportunityAssignmentToDeal(deal: RcEmployeeSubject): boolean {
  return !isDealRcEmployeeOverride(deal);
}

export function buildInheritedDealAssignment(input: {
  opportunity: RcEmployeeSubject;
  existingDealExtension?: unknown;
  hierarchyVisibilityUserIds?: string[];
}): {
  relationshipManagerUserId: string | null;
  relationshipManagerName: string | null;
  primaryOwnerUserId: string | null;
  assignmentMode: RcEmployeeAssignmentSource;
  lendingExtension: Record<string, unknown>;
} {
  const resolved = resolveRcEmployee(input.opportunity);
  const patch = buildAssignmentPatch(resolved.assignedUsers, resolved.userId);
  const baseExtension = input.existingDealExtension ?? {};
  const lendingExtension = resolved.userId
    ? stampRcEmployeeExtension(
        baseExtension,
        {
          userId: resolved.userId,
          name: resolved.name || patch.relationshipManagerName || "",
          assignedUsers: patch.lendingExtensionPatch,
        },
        "inherited",
        input.hierarchyVisibilityUserIds,
      )
    : { ...asRecord(baseExtension), [RC_EMPLOYEE_ASSIGNMENT_SOURCE_KEY]: "inherited" };

  return {
    relationshipManagerUserId: patch.relationshipManagerUserId,
    relationshipManagerName: patch.relationshipManagerName,
    primaryOwnerUserId: patch.primaryOwnerUserId,
    assignmentMode: "inherited",
    lendingExtension,
  };
}

export function overlayDealRcEmployeeDisplay(input: {
  deal: RcEmployeeSubject;
  opportunity?: RcEmployeeSubject | null;
}): {
  userId: string | null;
  name: string | null;
  assignedUsers: AssignedUserRef[];
  assignmentMode: RcEmployeeAssignmentSource;
  resolvedFromOpportunity: boolean;
} {
  const declared = readRcEmployeeAssignmentSource(input.deal);
  const deal = resolveRcEmployee(input.deal);
  if (declared === "override") {
    return {
      ...deal,
      assignmentMode: "override",
      resolvedFromOpportunity: false,
    };
  }
  if (deal.userId) {
    return {
      ...deal,
      assignmentMode: declared ?? "inherited",
      resolvedFromOpportunity: false,
    };
  }
  const opportunity = input.opportunity
    ? resolveRcEmployee(input.opportunity)
    : { userId: null, name: null, assignedUsers: [] };
  if (opportunity.userId) {
    return {
      ...opportunity,
      assignmentMode: "inherited",
      resolvedFromOpportunity: true,
    };
  }
  return {
    userId: null,
    name: null,
    assignedUsers: [],
    assignmentMode: declared ?? "inherited",
    resolvedFromOpportunity: false,
  };
}

export function formatRcEmployeeDesignation(input: {
  role?: string | null;
  department?: string | null;
}): string | null {
  const department = input.department?.trim() || "";
  if (department) return department;
  const role = (input.role ?? "").trim();
  if (!role) return null;
  return role.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function buildOverrideDealAssignment(input: {
  existingExtension: unknown;
  userId: string;
  name: string;
  hierarchyVisibilityUserIds?: string[];
}): {
  relationshipManagerUserId: string;
  relationshipManagerName: string;
  primaryOwnerUserId: string;
  assignmentMode: "override";
  lendingExtension: Record<string, unknown>;
} {
  const assigned: AssignedUserRef[] = [
    { id: input.userId, name: input.name, isPrimaryOwner: true },
  ];
  return {
    relationshipManagerUserId: input.userId,
    relationshipManagerName: input.name,
    primaryOwnerUserId: input.userId,
    assignmentMode: "override",
    lendingExtension: stampRcEmployeeExtension(
      input.existingExtension,
      { userId: input.userId, name: input.name, assignedUsers: assigned },
      "override",
      input.hierarchyVisibilityUserIds,
    ),
  };
}

export type DealParticipantRow = {
  id: string;
  name: string;
  role: string;
  mobile?: string;
  contactId?: string;
};

export function mergeDealControlParticipants(input: {
  customerName?: string | null;
  customerId?: string | null;
  rcEmployeeName?: string | null;
  rcEmployeeUserId?: string | null;
  lenderSalesContactName?: string | null;
  lenderSalesContactId?: string | null;
  lenderSalesContactMobile?: string | null;
  lenderSalesContactRole?: string | null;
}): DealParticipantRow[] {
  const rows: DealParticipantRow[] = [];
  const seen = new Set<string>();
  const push = (row: DealParticipantRow) => {
    const key = `${row.role.toLowerCase()}::${(row.contactId || row.id || row.name).trim().toLowerCase()}`;
    if (seen.has(key)) return;
    if (!row.name.trim()) return;
    seen.add(key);
    rows.push(row);
  };

  if (input.customerName?.trim()) {
    push({
      id: "customer",
      name: input.customerName.trim(),
      role: "Customer",
      contactId: input.customerId ?? undefined,
    });
  }
  if (input.rcEmployeeName?.trim()) {
    push({
      id: `rc-employee:${input.rcEmployeeUserId || input.rcEmployeeName}`,
      name: input.rcEmployeeName.trim(),
      role: "Rupee Catalyst Employee",
    });
  }
  if (input.lenderSalesContactName?.trim()) {
    push({
      id: `lender-employee:${input.lenderSalesContactId || input.lenderSalesContactName}`,
      name: input.lenderSalesContactName.trim(),
      role: input.lenderSalesContactRole?.trim() || "Lender Sales Contact",
      mobile: input.lenderSalesContactMobile ?? undefined,
      contactId: input.lenderSalesContactId ?? undefined,
    });
  }
  return rows;
}

export function formatRcEmployeeAssignmentSummary(input: {
  previousName?: string | null;
  previousUserId?: string | null;
  nextName?: string | null;
  nextUserId?: string | null;
  source: RcEmployeeAssignmentSource;
}): string {
  const from = input.previousName?.trim() || "Unassigned";
  const to = input.nextName?.trim() || "Unassigned";
  const sourceLabel = input.source === "override" ? "Deal override" : "Opportunity inheritance";
  return `Rupee Catalyst Employee ${from} → ${to} (${sourceLabel})`;
}
