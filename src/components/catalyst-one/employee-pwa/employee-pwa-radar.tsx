"use client";

import { Suspense } from "react";
import { ChanakyaRadarWorkspace } from "@/components/catalyst-one/chanakya-radar";
import { EMPLOYEE_PWA_NO_LIVE_LENDER_RECOMMENDATION } from "@/constants/employee-pwa";

export function EmployeePwaRadar() {
  return (
    <div data-employee-pwa-radar="true" className="space-y-3">
      <h1 className="text-xl font-semibold">CHANAKYA Radar</h1>
      <p className="text-xs text-muted-foreground">{EMPLOYEE_PWA_NO_LIVE_LENDER_RECOMMENDATION}</p>
      <div className="overflow-x-auto">
        <Suspense fallback={<p className="text-sm">Loading Radar…</p>}>
          <ChanakyaRadarWorkspace />
        </Suspense>
      </div>
    </div>
  );
}
