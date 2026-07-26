"use client";

import { Suspense } from "react";
import { UserHomeDashboard } from "@/components/catalyst-one/user-home-dashboard";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

/** CO-SPRINT-114 — User Home Dashboard (operational landing). */
export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="dashboard"
          statusLabel="Opening Dashboard…"
          density="panel"
        />
      }
    >
      <UserHomeDashboard />
    </Suspense>
  );
}
