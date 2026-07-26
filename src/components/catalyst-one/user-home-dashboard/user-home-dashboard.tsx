"use client";

import Link from "next/link";
import {
  Briefcase,
  CalendarDays,
  CheckSquare,
  Contact,
  FileStack,
  FolderOpen,
  Landmark,
  Sparkles,
  Target,
} from "lucide-react";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  USER_HOME_DASHBOARD_NAME,
  USER_HOME_FUTURE_ROLE_PACKS,
} from "@/constants/user-home-dashboard";
import { ROUTES } from "@/constants/routes";
import { buildDashboardHref } from "@/lib/lead-opportunity-journey/active-context";
import { canViewNewArrivalsKpis } from "@/lib/user-home-dashboard/new-arrivals";
import { cn } from "@/lib/utils";
import { NewArrivalsSection } from "@/components/catalyst-one/user-home-dashboard/new-arrivals-section";
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

const QUICK_ACTIONS = [
  { label: "New Contact", href: ROUTES.CONTACTS, icon: Contact },
  { label: "New Deal", href: ROUTES.MY_DEALS, icon: Briefcase },
  { label: "Open Tasks", href: ROUTES.TASKS, icon: CheckSquare },
  { label: "My Deals", href: ROUTES.MY_DEALS, icon: Landmark },
  { label: "Documents", href: buildDashboardHref(ROUTES.DOCUMENT_CENTER), icon: FileStack },
] as const;

const PRIORITY_PLACEHOLDERS = [
  { title: "Priority follow-ups", description: "Items needing action today — widget coming soon." },
  { title: "Overdue tasks", description: "Tasks past due — widget coming soon." },
  { title: "Approvals waiting", description: "Decisions pending on you — widget coming soon." },
] as const;

const BUSINESS_PLACEHOLDERS = [
  { title: "My Deals", description: "Deals assigned to you — widget coming soon.", href: ROUTES.MY_DEALS },
  { title: "My Tasks", description: "Open and overdue tasks — widget coming soon.", href: ROUTES.TASKS },
  {
    title: "Pipeline health",
    description: "Personal pipeline snapshot — widget coming soon.",
    href: ROUTES.MY_DEALS,
  },
  {
    title: "Deals awaiting action",
    description: "Deals that need attention — widget coming soon.",
    href: ROUTES.MY_DEALS,
  },
] as const;

const PERFORMANCE_PLACEHOLDERS = [
  { label: "Active Deals", value: "—" },
  { label: "Pipeline Value", value: "—" },
  { label: "Conversion", value: "—" },
  { label: "SLA Adherence", value: "—" },
] as const;

const ACTIVITY_PLACEHOLDERS = [
  "No activity recorded for today yet.",
  "Operational events will appear here in a later sprint.",
  "This timeline is a structural placeholder only.",
] as const;

/**
 * CO-UX-115 / CO-SPRINT-114 — Official User Home Dashboard foundation.
 * Operational home: “What do I need to know and do today?”
 * Not Mission Control. Not Executive Briefing.
 */
export function UserHomeDashboard() {
  const { user } = useAuthContext();
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || "Colleague";
  const roleLabel = user?.role ? formatRoleLabel(String(user.role)) : "Team Member";
  const branchLabel = user?.department?.trim() || "Branch not set";
  const organizationLabel = "Rupee Catalyst";

  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:gap-8 md:p-6"
      data-dashboard="user-home"
      data-widget-slots="welcome,new_arrivals,my_priorities,my_business,chanakya,quick_actions,todays_activity,calendar,performance_snapshot"
      data-role-packs={USER_HOME_FUTURE_ROLE_PACKS.join(",")}
    >
      <header className="space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {USER_HOME_DASHBOARD_NAME}
        </p>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
          What do I need to know and do today?
        </h1>
      </header>

      {/* Welcome Header */}
      <section aria-label="Welcome Header" data-widget-slot="welcome">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">
              {greetingForNow()} {displayName}
            </CardTitle>
            <CardDescription>
              Your operational home. Mission Control remains the executive command center.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Role</dt>
                <dd className="font-medium text-foreground">{roleLabel}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Branch</dt>
                <dd className="font-medium text-foreground">{branchLabel}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Organization
                </dt>
                <dd className="font-medium text-foreground">{organizationLabel}</dd>
              </div>
            </dl>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Role-aware layout packs ({USER_HOME_FUTURE_ROLE_PACKS.join(" · ")}) — structure only;
              business logic in a later sprint.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* CO-SPRINT-119 — New Arrivals (managers / admins) */}
      {canViewNewArrivalsKpis(user?.role as Role | undefined) ? <NewArrivalsSection /> : null}

      {/* Quick Actions */}
      <section aria-label="Quick Actions" data-widget-slot="quick_actions" className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Button key={action.label} asChild variant="outline" size="sm" className="h-9 gap-2">
                <Link href={action.href}>
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {action.label}
                </Link>
              </Button>
            );
          })}
        </div>
      </section>

      {/* My Priorities */}
      <section aria-label="My Priorities" data-widget-slot="my_priorities" className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Target className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          My Priorities
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {PRIORITY_PLACEHOLDERS.map((card) => (
            <Card key={card.title}>
              <CardHeader className="space-y-1 p-4">
                <CardTitle className="text-sm">{card.title}</CardTitle>
                <CardDescription className="text-[12px] leading-relaxed">
                  {card.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* My Business */}
      <section aria-label="My Business" data-widget-slot="my_business" className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">My Business</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {BUSINESS_PLACEHOLDERS.map((card) => (
            <Link key={card.title} href={card.href} className="group block">
              <Card className="h-full transition-colors group-hover:border-primary/40">
                <CardHeader className="space-y-1 p-4">
                  <CardTitle className="text-sm">{card.title}</CardTitle>
                  <CardDescription className="text-[12px] leading-relaxed">
                    {card.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* CHANAKYA Recommendations */}
      <section aria-label="CHANAKYA Recommendations" data-widget-slot="chanakya">
        <Card>
          <CardHeader className="flex flex-row items-start gap-3 space-y-0 p-4 pb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm">CHANAKYA Recommendations</CardTitle>
              <CardDescription>Guidance panel — structure only in this sprint.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 pt-2 md:grid-cols-2">
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
              <p className="text-xs font-medium">Recommended focus</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Placeholder — recommendations will be wired in a later sprint. No AI in this sprint.
              </p>
            </div>
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
              <p className="text-xs font-medium">Suggested next actions</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Placeholder — suggested actions will appear here later.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Activity */}
        <section
          aria-label="Today's Activity"
          data-widget-slot="todays_activity"
          className="space-y-3"
        >
          <h2 className="text-sm font-semibold tracking-tight">Today&apos;s Activity</h2>
          <Card>
            <CardContent className="space-y-3 p-4">
              {ACTIVITY_PLACEHOLDERS.map((line) => (
                <div
                  key={line}
                  className={cn(
                    "flex items-start gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0",
                  )}
                >
                  <FolderOpen
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <p className="text-[12px] text-muted-foreground">{line}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* Calendar */}
        <section aria-label="Calendar" data-widget-slot="calendar" className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            Calendar
          </h2>
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-[12px] text-muted-foreground">
                Meetings and callbacks for today — calendar widget coming soon.
              </p>
              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-8 text-center">
                <p className="text-xs font-medium text-muted-foreground">No events loaded</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Placeholder only</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Performance Snapshot */}
      <section
        aria-label="Performance Snapshot"
        data-widget-slot="performance_snapshot"
        className="space-y-3"
      >
        <h2 className="text-sm font-semibold tracking-tight">Performance Snapshot</h2>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {PERFORMANCE_PLACEHOLDERS.map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {kpi.label}
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-muted-foreground">
                  {kpi.value}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">Placeholder</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
