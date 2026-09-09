"use client";

import Link from "next/link";
import { useAuthContext } from "@/components/providers/auth-provider";
import { listEteTasks } from "@/lib/enterprise-task-engine";
import { sameAssigneeRef } from "@/lib/enterprise-task-engine/my-work";
import { EmployeePwaRecordCard } from "@/components/catalyst-one/employee-pwa/employee-pwa-record-card";
import { formatEmployeePwaDate } from "@/lib/employee-pwa/source-identity";

export function EmployeePwaTasks() {
  const { user } = useAuthContext();
  const tasks = listEteTasks().filter((task) =>
    user ? sameAssigneeRef(task.assigneeRef, user.id) && task.status !== "cancelled" : false,
  );

  return (
    <div data-employee-pwa-tasks="true" className="space-y-3">
      <h1 className="text-xl font-semibold">Tasks</h1>
      <Link className="text-sm text-primary" href="/pwa/create/task">
        Create task
      </Link>
      {tasks.map((task) => (
        <EmployeePwaRecordCard
          key={task.id}
          href="/pwa/work/tasks"
          title={task.title || task.predefinedDescription}
          badge={task.status}
          lines={[
            task.entityLabel || task.workType || "Enterprise task",
            task.dueOn ? `Due ${formatEmployeePwaDate(task.dueOn)}` : "No due date",
          ]}
        />
      ))}
      {!tasks.length ? <p className="text-xs text-muted-foreground">No tasks assigned.</p> : null}
    </div>
  );
}
