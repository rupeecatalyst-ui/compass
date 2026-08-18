import { Suspense } from "react";
import { ActivityDeskWorkspace } from "@/components/catalyst-one/activity/activity-desk-workspace";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

export default function ActivityPage() {
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="enterprise"
          statusLabel="Opening Activity…"
          density="panel"
        />
      }
    >
      <ActivityDeskWorkspace />
    </Suspense>
  );
}
