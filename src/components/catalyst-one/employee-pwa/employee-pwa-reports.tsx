"use client";

import { useEffect, useState } from "react";
import { useAuthContext } from "@/components/providers/auth-provider";
import { employeePwaCanSeeReports } from "@/lib/employee-pwa/nav";
import { employeePwaJson } from "@/lib/employee-pwa/api";

export function EmployeePwaReports() {
  const { user } = useAuthContext();
  const allowed = employeePwaCanSeeReports(user?.role);
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!allowed) return;
    void employeePwaJson<Record<string, unknown>>("/api/admin/business-intelligence?view=snapshot")
      .then(setSnapshot)
      .catch((err: Error) => setError(err.message));
  }, [allowed]);

  if (!allowed) {
    return (
      <p className="text-sm text-muted-foreground">
        Reports appear only when an administrator has granted access. No report editor is available here.
      </p>
    );
  }

  return (
    <div data-employee-pwa-reports="true" className="space-y-3">
      <h1 className="text-xl font-semibold">Permitted reports</h1>
      <p className="text-xs text-muted-foreground">Read-only cards. Report definitions cannot be edited on mobile.</p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {snapshot ? (
        <pre className="max-h-80 overflow-auto rounded-xl border p-3 text-[11px]">
          {JSON.stringify(snapshot, null, 2).slice(0, 4000)}
        </pre>
      ) : (
        <p className="text-xs text-muted-foreground">Loading permitted snapshot…</p>
      )}
    </div>
  );
}
