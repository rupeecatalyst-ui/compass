import { Suspense } from "react";
import { EnterpriseTasksWorkspace } from "@/components/catalyst-one/tasks/enterprise-tasks-workspace";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="tasks"
          statusLabel="Preparing Tasks Workspace..."
          density="panel"
        />
      }
    >
      <EnterpriseTasksWorkspace />
    </Suspense>
  );
}
