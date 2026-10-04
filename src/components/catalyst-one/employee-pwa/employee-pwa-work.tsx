"use client";

import Link from "next/link";
import { useAuthContext } from "@/components/providers/auth-provider";
import { employeePwaWorkModulesForRole } from "@/lib/employee-pwa/nav";

export function EmployeePwaWork() {
  const { user } = useAuthContext();
  const modules = employeePwaWorkModulesForRole(user?.role);

  return (
    <div data-employee-pwa-work="true" className="space-y-3">
      <h1 className="text-xl font-semibold">Work</h1>
      <p className="text-xs text-muted-foreground">
        Authorised Catalyst One modules. Administration and master configuration stay on desktop.
      </p>
      <ul className="space-y-2">
        {modules.map((module) => (
          <li key={module.id}>
            <Link
              href={module.href}
              className="flex min-h-12 items-center rounded-xl border bg-card px-3 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {module.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
