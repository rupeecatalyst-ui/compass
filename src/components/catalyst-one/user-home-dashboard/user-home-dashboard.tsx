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
import { NewOpportunitiesSection } from "@/components/catalyst-one/user-home-dashboard/new-opportunities-section";
import { NewArrivalsPulseSection } from "@/components/catalyst-one/user-home-dashboard/new-arrivals-pulse-section";
import { AttentionRequiredSection } from "@/components/catalyst-one/user-home-dashboard/attention-required-section";
import { MyAssignedDealsSection } from "@/components/catalyst-one/user-home-dashboard/my-assigned-deals-section";
import { MyPipelineSection } from "@/components/catalyst-one/user-home-dashboard/my-pipeline-section";
import { MyPerformanceSection } from "@/components/catalyst-one/user-home-dashboard/my-performance-section";
import { VisualAnalyticsPack } from "@/components/catalyst-one/user-home-dashboard/visual-analytics-pack";
import { ChanakyaInsightsSection } from "@/components/catalyst-one/user-home-dashboard/chanakya-insights-section";
import { FreshLoginsSection } from "@/components/catalyst-one/user-home-dashboard/fresh-logins-section";
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
 * CO-C1-DASH-001 — User Home operational command center.
 * Hierarchy: New Opportunities → New Arrivals → Attention → Assigned Deals →
 * Pipeline → Performance → Business Intelligence → CHANAKYA Insights.
 */
export function UserHomeDashboard() {
  const { user } = useAuthContext();
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || "Colleague";
  const roleLabel = user?.role ? formatRoleLabel(String(user.role)) : "Team Member";
  const branchLabel = user?.department?.trim() || "Branch not set";
  const showNewArrivals = canViewNewArrivalsKpis(user?.role as Role | undefined);

  return (
    <EiPremiumCanvas className="min-h-[calc(100vh-3.5rem)]">
      <div
        className="mx-auto flex w-full max-w-[100rem] flex-col gap-6 p-4 md:gap-7 md:p-6"
        data-dashboard="user-home"
        data-sprint="CO-C1-DASH-001"
        data-widget-slots="welcome,new_opportunities,new_arrivals_pulse,attention_required,my_assigned_deals,my_pipeline,my_performance,visual_analytics,chanakya_insights"
        data-role-packs={USER_HOME_FUTURE_ROLE_PACKS.join(",")}
      >
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <p className="ei-eyebrow">{USER_HOME_DASHBOARD_NAME}</p>
            <h1 className="ei-display text-xl text-[var(--ei-ink)] md:text-2xl">
              {greetingForNow()} {displayName}
            </h1>
            <p className="text-[12px] text-muted-foreground">
              {roleLabel} · {branchLabel} · Operational command center
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

        {/* 1–3 — Dense two-column command strip (desktop); stack on tablet/mobile */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch lg:gap-5">
          <div className="flex min-w-0 w-full flex-col lg:col-span-7 lg:min-h-[min(28rem,calc(100dvh-16rem))]">
            <NewOpportunitiesSection />
          </div>
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-5">
            {showNewArrivals ? <NewArrivalsPulseSection /> : null}
            <AttentionRequiredSection />
          </div>
        </div>

        {/* 4 — My Assigned Deals */}
        <MyAssignedDealsSection />

        {/* 5 — My Pipeline */}
        <MyPipelineSection />

        {/* 6 — My Performance */}
        <MyPerformanceSection />

        {/* 7 — Business Intelligence (analytics lower) */}
        <section aria-label="Business Intelligence" data-widget-slot="visual_analytics" className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Business Intelligence</h2>
            <p className="text-[12px] text-muted-foreground">
              Existing enterprise analytics — supporting the operational desk above.
            </p>
          </div>
          <FreshLoginsSection />
          <VisualAnalyticsPack />
        </section>

        {/* 8 — CHANAKYA Insights */}
        <ChanakyaInsightsSection />
      </div>
    </EiPremiumCanvas>
  );
}
