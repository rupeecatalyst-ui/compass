/**
 * Rupee Catalyst employee assignment on Opportunity → Deal.
 * Source is stored on Deal.assignmentMode (existing column) and mirrored in lendingExtension.
 * No schema migration.
 */

export const RC_EMPLOYEE_ASSIGNMENT_SOURCES = ["inherited", "override"] as const;
export type RcEmployeeAssignmentSource = (typeof RC_EMPLOYEE_ASSIGNMENT_SOURCES)[number];

export const RC_EMPLOYEE_ASSIGNMENT_SOURCE_KEY = "rcEmployeeAssignmentSource" as const;
export const RC_EMPLOYEE_PARTICIPANT_ROLE = "Rupee Catalyst Employee";
export const LENDER_EMPLOYEE_PARTICIPANT_ROLE = "Lender Sales Contact";

export const RC_EMPLOYEE_TIMELINE_EVENT = "rc_employee_assignment_changed";

export type RcEmployeeAssignmentAction = "override" | "restore_inheritance";

export const GENERIC_RC_EMPLOYEE_NAME_PATTERN =
  /^(unassigned|not assigned|not specified|n\/?a|none|system|default|generic|admin user|—|-|\.)$/i;
