/**
 * CO-LENDER-HIERARCHY-REMEDIATION-001
 * Hierarchy is a projection of ECM Lender Employees — no localStorage / demo ranks.
 */

import type { EldLenderEmployeeRow } from "@/types/enterprise-lender-directory-ops";
import type { EldHierarchyForest, EldHierarchyTreeNode } from "@/types/enterprise-lender-hierarchy";

function sortEmployees(a: EldLenderEmployeeRow, b: EldLenderEmployeeRow): number {
  const d = a.designationLabel.localeCompare(b.designationLabel, undefined, {
    sensitivity: "base",
  });
  if (d !== 0) return d;
  return a.employeeName.localeCompare(b.employeeName, undefined, { sensitivity: "base" });
}

function toNode(
  row: EldLenderEmployeeRow,
  depth: number,
  childrenByManager: Map<string, EldLenderEmployeeRow[]>,
  visiting: Set<string>,
): EldHierarchyTreeNode {
  if (visiting.has(row.contactId)) {
    return {
      contactId: row.contactId,
      employeeName: row.employeeName,
      designationLabel: row.designationLabel,
      departmentLabel: row.branchLabel || "Not Specified",
      status: row.status,
      statusLabel: row.statusLabel,
      reportingManagerContactId: row.reportingManagerContactId,
      reportingManagerName: row.reportingManagerName,
      mobile: row.mobile,
      email: row.email,
      depth,
      directReportCount: 0,
      children: [],
      employee: row,
    };
  }
  visiting.add(row.contactId);
  const kids = [...(childrenByManager.get(row.contactId) ?? [])].sort(sortEmployees);
  const children = kids.map((k) => toNode(k, depth + 1, childrenByManager, visiting));
  visiting.delete(row.contactId);
  return {
    contactId: row.contactId,
    employeeName: row.employeeName,
    designationLabel: row.designationLabel,
    departmentLabel: row.branchLabel || "Not Specified",
    status: row.status,
    statusLabel: row.statusLabel,
    reportingManagerContactId: row.reportingManagerContactId,
    reportingManagerName: row.reportingManagerName,
    mobile: row.mobile,
    email: row.email,
    depth,
    directReportCount: children.length,
    children,
    employee: row,
  };
}

/**
 * Build reporting forest for one institution from composed employee rows.
 * Edges come from reportingManagerContactId (ECM reports_to + profile cache).
 * Employees whose manager is outside this institution (or unset) become roots.
 */
export function composeEldLenderHierarchyForest(
  employeesForInstitution: EldLenderEmployeeRow[],
): EldHierarchyForest {
  const byId = new Map(employeesForInstitution.map((e) => [e.contactId, e]));
  const childrenByManager = new Map<string, EldLenderEmployeeRow[]>();
  const roots: EldLenderEmployeeRow[] = [];

  for (const emp of employeesForInstitution) {
    const mgr = emp.reportingManagerContactId?.trim();
    if (mgr && byId.has(mgr) && mgr !== emp.contactId) {
      const list = childrenByManager.get(mgr) ?? [];
      list.push(emp);
      childrenByManager.set(mgr, list);
    } else {
      roots.push(emp);
    }
  }

  roots.sort(sortEmployees);
  const trees = roots.map((r) => toNode(r, 0, childrenByManager, new Set()));

  return {
    lenderId: employeesForInstitution[0]?.institutionId ?? "",
    employeeCount: employeesForInstitution.length,
    rootCount: trees.length,
    trees,
  };
}

export function flattenEldHierarchyForest(forest: EldHierarchyForest): EldHierarchyTreeNode[] {
  const out: EldHierarchyTreeNode[] = [];
  const walk = (nodes: EldHierarchyTreeNode[]) => {
    for (const n of nodes) {
      out.push(n);
      if (n.children.length) walk(n.children);
    }
  };
  walk(forest.trees);
  return out;
}

export function filterEmployeesForInstitution(
  rows: EldLenderEmployeeRow[],
  lenderId: string,
): EldLenderEmployeeRow[] {
  const id = lenderId.trim();
  if (!id) return [];
  const want = id.toLowerCase();
  return rows.filter((r) => {
    const inst = (r.institutionId ?? "").trim().toLowerCase();
    return inst === want;
  });
}
