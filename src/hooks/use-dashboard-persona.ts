"use client";

import { useMemo } from "react";
import { useAuthContext } from "@/components/providers/auth-provider";
import { ROLES, type Role } from "@/constants/roles";
import type { DashboardPersona, DashboardLayoutConfig } from "@/types/catalyst-one";

const EXECUTIVE_KPIS = [
  "total_pipeline",
  "sanctioned",
  "disbursed",
  "expected_revenue",
  "new_leads",
  "tasks_due",
] as const;

const EXECUTIVE_FOCUS = [
  "disbursement_pending",
  "credit_queries",
  "expected_disbursement",
  "compliance_due",
  "followups",
] as const;

const PERSONA_CONFIG: Record<DashboardPersona, DashboardLayoutConfig> = {
  ceo: {
    persona: "ceo",
    greetingHint: "Operational priorities for today.",
    showTargetGauges: true,
    showPerformanceChart: false,
    kpiIds: [...EXECUTIVE_KPIS],
    focusTileIds: [...EXECUTIVE_FOCUS],
  },
  relationship_manager: {
    persona: "relationship_manager",
    greetingHint: "Your priority files and follow-ups for today.",
    showTargetGauges: true,
    showPerformanceChart: false,
    kpiIds: ["total_pipeline", "sanctioned", "disbursed", "new_leads", "tasks_due"],
    focusTileIds: ["followups", "expected_disbursement", "credit_queries", "disbursement_pending"],
  },
  credit_manager: {
    persona: "credit_manager",
    greetingHint: "Files that need credit review or a decision.",
    showTargetGauges: false,
    showPerformanceChart: false,
    kpiIds: ["total_pipeline", "sanctioned", "tasks_due", "new_leads"],
    focusTileIds: ["credit_queries", "disbursement_pending", "compliance_due", "followups"],
  },
  operations: {
    persona: "operations",
    greetingHint: "Disbursements and operational items on your radar.",
    showTargetGauges: false,
    showPerformanceChart: false,
    kpiIds: ["total_pipeline", "disbursed", "expected_revenue", "tasks_due", "sanctioned"],
    focusTileIds: ["disbursement_pending", "expected_disbursement", "compliance_due", "followups"],
  },
};

function roleToPersona(role: Role): DashboardPersona {
  switch (role) {
    case ROLES.SUPER_ADMIN:
    case ROLES.ADMIN:
      return "ceo";
    case ROLES.MANAGER:
      return "operations";
    case ROLES.ANALYST:
      return "credit_manager";
    default:
      return "relationship_manager";
  }
}

export function useDashboardPersona() {
  const { user } = useAuthContext();

  return useMemo(() => {
    const persona = user ? roleToPersona(user.role) : "ceo";
    return {
      persona,
      config: PERSONA_CONFIG[persona],
      firstName: user?.firstName ?? "Rahul",
    };
  }, [user]);
}
