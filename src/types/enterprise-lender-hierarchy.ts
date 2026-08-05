/**
 * CO-LENDER-HIERARCHY-REMEDIATION-001
 * Hierarchy projection types — ECM Lender Employees only (no localStorage ranks).
 */

import type {
  EldLenderEmployeeRow,
  EldLenderEmployeeStatus,
} from "@/types/enterprise-lender-directory-ops";

export interface EldHierarchyTreeNode {
  contactId: string;
  employeeName: string;
  designationLabel: string;
  /** Branch / org unit when captured; otherwise Not Specified */
  departmentLabel: string;
  status: EldLenderEmployeeStatus;
  statusLabel: string;
  reportingManagerContactId?: string;
  reportingManagerName: string;
  mobile: string;
  email: string;
  depth: number;
  directReportCount: number;
  children: EldHierarchyTreeNode[];
  /** Full composed employee row for workspace actions */
  employee: EldLenderEmployeeRow;
}

export interface EldHierarchyForest {
  lenderId: string;
  employeeCount: number;
  rootCount: number;
  trees: EldHierarchyTreeNode[];
}

export type EldHierarchyEmployeeAction =
  | "open_workspace"
  | "view_profile"
  | "edit_assignment"
  | "change_reporting_manager"
  | "view_performance"
  | "view_pipeline"
  | "view_communication"
  | "add_report";
