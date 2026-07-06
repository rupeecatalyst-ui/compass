"use client";

import { DashboardContent } from "@/components/catalyst-one/dashboard/dashboard-content";
import { DashboardFilterProvider } from "@/hooks/use-dashboard-filter";

export default function DashboardPage() {
  return (
    <DashboardFilterProvider>
      <div className="dashboard-command-centre -mx-4 md:-mx-6 lg:-mx-8 -mt-4 md:-mt-6 lg:-mt-8 min-h-[calc(100vh-4rem)] bg-[#0b1220] px-4 md:px-6 lg:px-8 pt-3 md:pt-4 pb-6">
        <DashboardContent />
      </div>
    </DashboardFilterProvider>
  );
}
