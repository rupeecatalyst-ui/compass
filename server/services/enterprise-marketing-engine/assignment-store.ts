/**
 * CO-MARKETING-MKT-11 — Idempotent assignment: one qualification → one assignee.
 */

import type { MarketingRouteAssignment } from "@/types/enterprise-marketing-qualification";

const byQualification = new Map<string, MarketingRouteAssignment>();

export const marketingAssignmentStore = {
  get(qualificationId: string): MarketingRouteAssignment | null {
    return byQualification.get(qualificationId) ?? null;
  },

  /**
   * Unique (qualificationId). Conflict returns the existing assignee.
   */
  claim(assignment: MarketingRouteAssignment): {
    assignment: MarketingRouteAssignment;
    idempotent: boolean;
  } {
    const existing = byQualification.get(assignment.qualificationId);
    if (existing) return { assignment: existing, idempotent: true };
    byQualification.set(assignment.qualificationId, assignment);
    return { assignment, idempotent: false };
  },

  resetOrganization(qualificationIds: string[]) {
    for (const id of qualificationIds) byQualification.delete(id);
  },

  resetAll() {
    byQualification.clear();
  },
};
