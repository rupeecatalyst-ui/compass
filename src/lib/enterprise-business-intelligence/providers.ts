/**
 * CO-BIZ-003 Phase 6 — Reusable dashboard data providers (no duplicate calculations).
 */

import type {
  EbiDashboardModel,
  EbiDashboardProviderId,
  EbiSnapshot,
} from "@/types/enterprise-business-intelligence";
import { composeBusinessIntelligenceSnapshot } from "./compose";

function baseModel(
  id: EbiDashboardProviderId,
  title: string,
  snapshot: EbiSnapshot,
  extras?: Partial<EbiDashboardModel>,
): EbiDashboardModel {
  return {
    id,
    title,
    asOf: snapshot.asOf,
    health: snapshot.health,
    executive: snapshot.executive,
    operational: snapshot.operational,
    team: snapshot.team,
    insights: snapshot.insights,
    ...extras,
  };
}

export function createMissionControlBiProvider() {
  return {
    getDashboard(): EbiDashboardModel {
      const snap = composeBusinessIntelligenceSnapshot();
      return baseModel("mission_control", "Mission Control Intelligence", snap);
    },
  };
}

export function createManagerBiProvider() {
  return {
    getDashboard(): EbiDashboardModel {
      const snap = composeBusinessIntelligenceSnapshot();
      return baseModel("manager", "Manager Dashboard", snap, {
        insights: snap.insights.filter((i) => i.tone === "danger" || i.tone === "warning").concat(
          snap.insights.filter((i) => i.tone === "success" || i.tone === "info").slice(0, 2),
        ),
      });
    },
  };
}

export function createRelationshipManagerBiProvider(rmName?: string) {
  return {
    getDashboard(): EbiDashboardModel {
      const snap = composeBusinessIntelligenceSnapshot();
      const focus =
        rmName?.trim() ||
        snap.team.members.find((m) => m.name !== "Unassigned RM")?.name;
      const team = {
        ...snap.team,
        members: focus
          ? snap.team.members.filter((m) => m.name === focus)
          : snap.team.members.slice(0, 1),
      };
      const dealsByRm = focus
        ? snap.executive.dealsByRm.filter((r) => r.name === focus)
        : snap.executive.dealsByRm.slice(0, 1);
      return baseModel("relationship_manager", "Relationship Manager Dashboard", snap, {
        focusRm: focus,
        team,
        executive: { ...snap.executive, dealsByRm },
      });
    },
  };
}

export function createBranchBiProvider(branchName?: string) {
  return {
    getDashboard(): EbiDashboardModel {
      const snap = composeBusinessIntelligenceSnapshot();
      const focus =
        branchName?.trim() ||
        snap.executive.dealsByBranch.find((b) => b.name !== "Unassigned Branch")?.name;
      const dealsByBranch = focus
        ? snap.executive.dealsByBranch.filter((b) => b.name === focus)
        : snap.executive.dealsByBranch.slice(0, 1);
      return baseModel("branch", "Branch Dashboard", snap, {
        focusBranch: focus,
        executive: { ...snap.executive, dealsByBranch },
      });
    },
  };
}

export function getEbiDashboard(id: EbiDashboardProviderId, focus?: string): EbiDashboardModel {
  switch (id) {
    case "manager":
      return createManagerBiProvider().getDashboard();
    case "relationship_manager":
      return createRelationshipManagerBiProvider(focus).getDashboard();
    case "branch":
      return createBranchBiProvider(focus).getDashboard();
    default:
      return createMissionControlBiProvider().getDashboard();
  }
}
