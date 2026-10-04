"use client";

import Link from "next/link";
import { useAuthContext } from "@/components/providers/auth-provider";
import { employeePwaCanSeeMissionControl } from "@/lib/employee-pwa/nav";
import { ROUTES } from "@/constants/routes";

export function EmployeePwaMissionControl() {
  const { user } = useAuthContext();
  if (!employeePwaCanSeeMissionControl(user?.role)) {
    return <p className="text-sm">Mission Control is available to Super Admin and Admin only.</p>;
  }

  return (
    <div data-employee-pwa-mission-control="true" className="space-y-3">
      <h1 className="text-xl font-semibold">Mission Control</h1>
      <p className="text-xs text-muted-foreground">
        Operational monitoring only. Administration, schema, and policy modules are not available in this companion.
      </p>
      <Link className="block min-h-12 rounded-xl border px-3 py-3 text-sm" href={ROUTES.MISSION_CONTROL_EXECUTIVE_BRIEFING}>
        Executive Briefing
      </Link>
      <Link className="block min-h-12 rounded-xl border px-3 py-3 text-sm" href={ROUTES.MISSION_CONTROL_ALERT_CENTER}>
        Alert Centre
      </Link>
      <Link className="block min-h-12 rounded-xl border px-3 py-3 text-sm" href="/pwa/chanakya/radar">
        CHANAKYA Radar
      </Link>
    </div>
  );
}
