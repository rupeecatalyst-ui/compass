/**
 * CO-UX-115 — Enterprise exit navigation & breadcrumb helpers.
 * Navigation chrome only — no workflow or data changes.
 */

import { ROUTES } from "@/constants/routes";
import type { LeadJourneyModuleId } from "@/constants/lead-opportunity-journey";
import { getLeadJourneyModule } from "@/constants/lead-opportunity-journey";
import type { BreadcrumbItem } from "@/types/navigation";

export const RETURN_TO_DASHBOARD_LABEL = "← Return to Dashboard" as const;

/** CO-UX-116 — Standard Mission Control / workspace exit control label. */
export const CLOSE_WORKSPACE_LABEL = "Close" as const;

export function dashboardBreadcrumb(): BreadcrumbItem {
  return { title: "Dashboard", href: ROUTES.DASHBOARD };
}

/** Mission Control crumbs: Dashboard → Mission Control → current module. */
export function buildMissionControlBreadcrumbs(
  currentLabel: string,
  options?: { includeBriefingLink?: boolean },
): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [
    dashboardBreadcrumb(),
    { title: "Mission Control", href: ROUTES.MISSION_CONTROL },
  ];
  if (options?.includeBriefingLink && currentLabel !== "Executive Briefing") {
    crumbs.push({
      title: "Executive Briefing",
      href: ROUTES.MISSION_CONTROL_EXECUTIVE_BRIEFING,
    });
  }
  crumbs.push({ title: currentLabel });
  return crumbs;
}

/**
 * Transactional journey crumbs:
 * Dashboard → My Deals → …modules along the certified lead spine up to current.
 */
export function buildJourneyBreadcrumbs(moduleId: LeadJourneyModuleId): BreadcrumbItem[] {
  const order: LeadJourneyModuleId[] = [
    "credit_bench",
    "document_center",
    "credit_workbench",
    "strategic_workspace",
    "loan_workspace",
  ];
  const idx = order.indexOf(moduleId);
  const crumbs: BreadcrumbItem[] = [
    dashboardBreadcrumb(),
    { title: "My Deals", href: ROUTES.MY_DEALS },
  ];
  const slice = idx >= 0 ? order.slice(0, idx + 1) : [moduleId];
  for (let i = 0; i < slice.length; i += 1) {
    const id = slice[i]!;
    const mod = getLeadJourneyModule(id);
    const isLast = i === slice.length - 1;
    crumbs.push({
      title: mod.label,
      href: isLast ? undefined : mod.href,
    });
  }
  return crumbs;
}

export function buildSimpleWorkspaceBreadcrumbs(
  workspaceTitle: string,
  parent?: BreadcrumbItem,
): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [dashboardBreadcrumb()];
  if (parent) crumbs.push(parent);
  crumbs.push({ title: workspaceTitle });
  return crumbs;
}
