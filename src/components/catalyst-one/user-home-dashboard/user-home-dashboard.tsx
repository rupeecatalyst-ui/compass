"use client";

import Link from "next/link";
import {
  Briefcase,
  CheckSquare,
  Contact,
  FileStack,
  Landmark,
} from "lucide-react";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  USER_HOME_DASHBOARD_NAME,
  USER_HOME_FUTURE_ROLE_PACKS,
} from "@/constants/user-home-dashboard";
import { ROUTES } from "@/constants/routes";
import { buildDashboardHref } from "@/lib/lead-opportunity-journey/active-context";
import { canViewNewArrivalsKpis } from "@/lib/user-home-dashboard/new-arrivals";
import { NewArrivalsSection } from "@/components/catalyst-one/user-home-dashboard/new-arrivals-section";
import { FreshLoginsSection } from "@/components/catalyst-one/user-home-dashboard/fresh-logins-section";
import { TodayNewCreationSection } from "@/components/catalyst-one/user-home-dashboard/today-new-creation-section";
import { VisualAnalyticsPack } from "@/components/catalyst-one/user-home-dashboard/visual-analytics-pack";
import { RmWorkspacePack } from "@/components/catalyst-one/user-home-dashboard/rm-workspace-pack";
import { EiPremiumCanvas } from "@/components/catalyst-one/executive-intelligence/ei-premium-canvas";
import type { Role } from "@/constants/roles";

function greetingForNow(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function formatRoleLabel(role: string): string {
  return role
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

const SHELL_QUICK_ACTIONS = [
  { label: "New Contact", href: ROUTES.CONTACTS, icon: Contact },
  { label: "New Deal", href: ROUTES.MY_DEALS, icon: Briefcase },
  { label: "Open Tasks", href: ROUTES.TASKS, icon: CheckSquare },
  { label: "My Deals", href: ROUTES.MY_DEALS, icon: Landmark },
  { label: "Documents", href: buildDashboardHref(ROUTES.DOCUMENT_CENTER), icon: FileStack },
] as const;

/**
 * CO-UX-115 / CO-BIZ-005 / CO-UX-006 Part 5 — User Home Dashboard.
 * Visual BI workspace: KPI strip → Visual Analytics → RM pack.
 */
export function UserHomeDashboard() {
  const { user } = useAuthContext();
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || "Colleague";
  const roleLabel = user?.role ? formatRoleLabel(String(user.role)) : "Team Member";
  const branchLabel = user?.department?.trim() || "Branch not set";

  return (
    <EiPremiumCanvas className="min-h-[calc(100vh-3.5rem)]">
      <div
        className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 md:gap-6 md:p-6"
        data-dashboard="user-home"
        data-widget-slots="welcome,today_new_creation,fresh_logins,visual_analytics,new_arrivals,quick_actions,rm_workspace"
        data-role-packs={USER_HOME_FUTURE_ROLE_PACKS.join(",")}
      >
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <p className="ei-eyebrow">{USER_HOME_DASHBOARD_NAME}</p>
            <h1 className="ei-display text-xl text-[var(--ei-ink)] md:text-2xl">
              {greetingForNow()} {displayName}
            </h1>
            <p className="text-[12px] text-muted-foreground">
              {roleLabel} · {branchLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SHELL_QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 bg-background/70 text-xs"
                >
                  <Link href={action.href}>
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {action.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        </header>

        {/* Section A — Creation KPIs (Opportunity ≠ Deal) */}
        <TodayNewCreationSection />

        {/* Section A2 — Fresh Logins (login stage ≠ create) */}
        <FreshLoginsSection />

        {/* Sections B–J — Visual Analytics */}
        <VisualAnalyticsPack />

        {canViewNewArrivalsKpis(user?.role as Role | undefined) ? <NewArrivalsSection /> : null}

        <section aria-label="RM Workspace" data-widget-slot="rm_workspace">
          <RmWorkspacePack />
        </section>
      </div>
    </EiPremiumCanvas>
  );
}
