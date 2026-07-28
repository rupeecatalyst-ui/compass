import { Suspense } from "react";
import { TaskEngineWorkspace } from "@/components/catalyst-one/tasks/task-engine-workspace";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="tasks"
          statusLabel="Preparing Task Engine..."
          density="panel"
        />
      }
    >
      <TaskEngineWorkspace />
    </Suspense>
  );
}
