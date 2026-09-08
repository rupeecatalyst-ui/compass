"use client";

import Link from "next/link";
import { useTheme } from "@/hooks/use-theme";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  EMPLOYEE_PWA_IOS_INSTALL_GUIDANCE,
  EMPLOYEE_PWA_PUSH_DISABLED_MESSAGE,
  EMPLOYEE_PWA_THEME_MODES,
} from "@/constants/employee-pwa";
import { employeePwaCanSeeMissionControl, employeePwaCanSeeReports } from "@/lib/employee-pwa/nav";
import { employeePwaPushStatus } from "@/lib/employee-pwa/push";
import { ROUTES } from "@/constants/routes";
import { getFullName } from "@/lib/permissions";

export function EmployeePwaMore() {
  const { user, logout } = useAuthContext();
  const { theme, setTheme, mounted } = useTheme();
  const push = employeePwaPushStatus();

  return (
    <div data-employee-pwa-more="true" className="space-y-4">
      <h1 className="text-xl font-semibold">More</h1>
      <p className="text-sm">{user ? getFullName(user) : ""}</p>
      <p className="text-xs text-muted-foreground">{user?.role}</p>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Theme</h2>
        <div className="flex gap-2" data-employee-pwa-theme="true">
          {EMPLOYEE_PWA_THEME_MODES.map((mode) => (
            <Button
              key={mode}
              type="button"
              size="sm"
              className="min-h-11 capitalize"
              variant={mounted && theme === mode ? "default" : "outline"}
              onClick={() => setTheme(mode)}
            >
              {mode}
            </Button>
          ))}
        </div>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="text-sm font-semibold">Install</h2>
        <p className="text-xs text-muted-foreground">
          Chrome and Edge on Android can install this companion from the browser menu.
        </p>
        <p className="text-xs text-muted-foreground">{EMPLOYEE_PWA_IOS_INSTALL_GUIDANCE}</p>
      </section>

      <section className="space-y-2">
        <Link className="block min-h-12 rounded-xl border px-3 py-3 text-sm" href="/pwa/work/notifications">
          Notification centre
        </Link>
        {employeePwaCanSeeReports(user?.role) ? (
          <Link className="block min-h-12 rounded-xl border px-3 py-3 text-sm" href="/pwa/work/reports">
            Permitted reports
          </Link>
        ) : null}
        {employeePwaCanSeeMissionControl(user?.role) ? (
          <Link className="block min-h-12 rounded-xl border px-3 py-3 text-sm" href="/pwa/work/mission-control">
            Mission Control
          </Link>
        ) : null}
        <Link className="block min-h-12 rounded-xl border px-3 py-3 text-sm" href={ROUTES.DOCUMENT_WORKSPACE}>
          Open desktop Document Workspace
        </Link>
        <Link className="block min-h-12 rounded-xl border px-3 py-3 text-sm" href={ROUTES.DASHBOARD}>
          Open desktop Catalyst One
        </Link>
      </section>

      <p className="text-xs text-muted-foreground" data-employee-pwa-push-status="true">
        {push.remotePushEnabled
          ? "Remote web push provider is configured."
          : EMPLOYEE_PWA_PUSH_DISABLED_MESSAGE}
      </p>

      <Button type="button" variant="outline" className="min-h-11 w-full" onClick={() => void logout()}>
        Sign out
      </Button>
    </div>
  );
}
