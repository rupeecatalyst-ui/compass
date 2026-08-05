"use client";

/**
 * CO-TASKS-PLANNER-001 — Enterprise Tasks Workspace
 * CO-TASKS-PLANNER-001A — Planner operational experience
 * CO-TASKS-PLANNER-002 — Workspace optimisation (calendar-first density)
 * CO-TASKS-PLANNER-003 — Enterprise Planner Workspace (actionable calendar)
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  TASKS_WORKSPACE_DEFAULT_TAB,
  TASKS_WORKSPACE_TABS,
  TASKS_WORKSPACE_TITLE,
} from "@/constants/enterprise-tasks-workspace";
import {
  PLANNER_DEFAULT_VIEW,
  type PlannerCreateIntent,
} from "@/constants/enterprise-planner";
import { ROUTES } from "@/constants/routes";
import {
  completeEteTask,
  deleteEteTask,
  ensureEnterpriseTasksDemoSeed,
  escalateEteOverdueTasks,
  listEteTasks,
  patchEteTask,
  sameAssigneeRef,
} from "@/lib/enterprise-task-engine";
import { buildPlannerChanakyaLiveItems } from "@/lib/enterprise-planner/chanakya-live-ticker";
import { buildEnterpriseTasksWorkspaceModel } from "@/lib/enterprise-tasks-workspace";
import { getStoredUser } from "@/lib/auth";
import type { EteTask } from "@/types/enterprise-task-engine";
import type {
  EnterprisePlannerEvent,
  PlannerViewMode,
} from "@/types/enterprise-planner";
import type { TasksWorkspacePrimaryTab } from "@/types/enterprise-tasks-workspace";
import type { PlannerEventContextAction } from "@/components/catalyst-one/tasks/planner-event-card";
import { PageHeader } from "@/components/design-system/page-header";
import { QuickTaskCreateModal } from "@/components/catalyst-one/tasks/quick-task-create-modal";
import { TaskDetailDrawer } from "@/components/catalyst-one/tasks/task-detail-drawer";
import { TasksWorkspaceSummaryStrip } from "@/components/catalyst-one/tasks/tasks-workspace-summary-strip";
import { PlannerChanakyaLiveTicker } from "@/components/catalyst-one/tasks/planner-chanakya-live-ticker";
import { TasksExecutionDesk } from "@/components/catalyst-one/tasks/tasks-execution-desk";
import {
  TasksPlannerDesk,
  PlannerRescheduleDialog,
} from "@/components/catalyst-one/tasks/tasks-planner-desk";
import { PlannerEventPreview } from "@/components/catalyst-one/tasks/planner-event-preview";
import { cn } from "@/lib/utils";

function resolveTab(raw: string | null): TasksWorkspacePrimaryTab {
  if (raw === "planner") return "planner";
  return TASKS_WORKSPACE_DEFAULT_TAB;
}

function resolvePlannerView(raw: string | null): PlannerViewMode {
  if (raw === "day" || raw === "week" || raw === "month" || raw === "agenda")
    return raw;
  return PLANNER_DEFAULT_VIEW;
}

function canManageTeamTasks(role?: string | null): boolean {
  if (!role) return false;
  const r = role.toUpperCase();
  return (
    r.includes("ADMIN") ||
    r.includes("MANAGER") ||
    r.includes("SUPERVISOR") ||
    r === "SUPER_ADMIN"
  );
}

export function EnterpriseTasksWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = getStoredUser();
  const userRef = user?.id ? `user:${user.id}` : "employee:rm-001";
  const actorRef = user?.id ? `user:${user.id}` : "ui";
  const teamScope = canManageTeamTasks(user?.role);

  const [tick, setTick] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [createIntent, setCreateIntent] = useState<PlannerCreateIntent | null>(
    null,
  );
  const [createDueOn, setCreateDueOn] = useState<string | null>(null);
  const [detailTask, setDetailTask] = useState<EteTask | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [previewEvent, setPreviewEvent] =
    useState<EnterprisePlannerEvent | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [rescheduleEvent, setRescheduleEvent] =
    useState<EnterprisePlannerEvent | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [focusDate, setFocusDate] = useState(() => new Date().toISOString());

  const tab = resolveTab(searchParams.get("tab"));
  const plannerView = resolvePlannerView(searchParams.get("view"));
  const isPlanner = tab === "planner";

  useEffect(() => {
    ensureEnterpriseTasksDemoSeed();
    try {
      escalateEteOverdueTasks("system");
    } catch {
      /* non-blocking */
    }
  }, []);

  const model = useMemo(
    () =>
      buildEnterpriseTasksWorkspaceModel({
        userRef,
        plannerView,
        focusDate,
      }),
    // tick forces recompose after mutations
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional refresh latch
    [userRef, plannerView, focusDate, tick],
  );

  const chanakyaLiveItems = useMemo(
    () => buildPlannerChanakyaLiveItems(model.planner.events),
    [model.planner.events],
  );

  const refresh = useCallback(() => {
    setTick((n) => n + 1);
  }, []);

  const setTab = (next: TasksWorkspacePrimaryTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "tasks") params.delete("tab");
    else params.set("tab", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const setPlannerView = (view: PlannerViewMode) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "planner");
    if (view === PLANNER_DEFAULT_VIEW) params.delete("view");
    else params.set("view", view);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const openTask = (task: EteTask) => {
    setDetailTask(task);
    setDetailOpen(true);
  };

  const resolveTask = (taskId?: string): EteTask | null => {
    if (!taskId) return null;
    return listEteTasks().find((t) => t.id === taskId) ?? null;
  };

  const onSelectPlannerEvent = (event: EnterprisePlannerEvent) => {
    setPreviewEvent(event);
    setPreviewOpen(true);
  };

  const openCreateFromPlanner = (intent: PlannerCreateIntent, dueOn: string) => {
    setCreateIntent(intent);
    setCreateDueOn(dueOn);
    setCreateOpen(true);
  };

  const openCreatePlain = () => {
    setCreateIntent(null);
    setCreateDueOn(null);
    setCreateOpen(true);
  };

  const handlePlannerContextAction = (
    event: EnterprisePlannerEvent,
    action: PlannerEventContextAction,
  ) => {
    switch (action) {
      case "preview":
        onSelectPlannerEvent(event);
        return;
      case "complete": {
        if (!event.taskId) {
          toast.error("Activity is not linked to the Enterprise Task Registry.");
          return;
        }
        try {
          completeEteTask(event.taskId, actorRef);
          toast.success("Marked complete.");
          refresh();
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Could not complete activity.",
          );
        }
        return;
      }
      case "reschedule":
        setRescheduleEvent(event);
        setRescheduleOpen(true);
        return;
      case "reassign": {
        if (!event.taskId) {
          toast.error("Activity is not linked to the Enterprise Task Registry.");
          return;
        }
        if (!teamScope) {
          toast.error("Reassign requires manager or admin permission.");
          return;
        }
        const next = window.prompt(
          "Reassign to (user id or user:… ref)",
          event.assigneeRef?.replace(/^user:/, "") ?? "",
        );
        if (next == null) return;
        const trimmed = next.trim();
        if (!trimmed) {
          toast.error("Assignee is required.");
          return;
        }
        const assigneeRef = trimmed.startsWith("user:")
          ? trimmed
          : `user:${trimmed}`;
        try {
          patchEteTask(event.taskId, { assigneeRef }, actorRef);
          toast.success("Activity reassigned.");
          refresh();
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Could not reassign.",
          );
        }
        return;
      }
      case "edit": {
        const task = resolveTask(event.taskId);
        if (!task) {
          onSelectPlannerEvent(event);
          return;
        }
        openTask(task);
        return;
      }
      case "open_deal": {
        if (event.opportunityId) {
          router.push(
            `${ROUTES.OPPORTUNITY_WORKSPACE}?opportunityId=${encodeURIComponent(event.opportunityId)}`,
          );
          return;
        }
        toast.error("No linked Opportunity / Deal on this activity.");
        return;
      }
      case "open_customer": {
        if (event.contactId) {
          router.push(
            `${ROUTES.CONTACTS}?contactId=${encodeURIComponent(event.contactId)}`,
          );
          return;
        }
        if (event.customerName) {
          router.push(
            `${ROUTES.CONTACTS}?q=${encodeURIComponent(event.customerName)}`,
          );
          return;
        }
        toast.error("No linked Customer on this activity.");
        return;
      }
      case "delete": {
        if (!event.taskId) {
          toast.error("Activity is not linked to the Enterprise Task Registry.");
          return;
        }
        if (!teamScope && event.assigneeRef && !sameAssigneeRef(event.assigneeRef, userRef)) {
          toast.error("You can only delete your own activities.");
          return;
        }
        if (
          !window.confirm(
            "Delete this activity? It will be closed in the Enterprise Task Registry.",
          )
        ) {
          return;
        }
        try {
          deleteEteTask(event.taskId, actorRef);
          toast.success("Activity deleted.");
          refresh();
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Could not delete activity.",
          );
        }
        return;
      }
      default:
        return;
    }
  };

  return (
    <div className="etw-root min-h-[calc(100vh-4rem)] bg-[#070b14] text-slate-100">
      <div
        className={cn(
          "mx-auto flex w-full max-w-[1600px] flex-col px-3 sm:px-4 lg:px-5",
          isPlanner ? "gap-2 py-2" : "gap-3 py-3",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <PageHeader
            title={TASKS_WORKSPACE_TITLE}
            description={
              isPlanner
                ? undefined
                : "Task management and operational planner — one workspace."
            }
            density="registry"
            className="min-w-0 flex-1 [&_h1]:text-slate-50 [&_p]:text-slate-400"
            actions={
              <div
                role="tablist"
                aria-label="Tasks workspace"
                className="inline-flex rounded-md border border-white/10 bg-[#0b1220] p-0.5"
              >
                {TASKS_WORKSPACE_TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.id}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "rounded px-3 py-1 text-[11px] font-semibold tracking-wide transition-colors",
                      tab === t.id
                        ? "bg-teal-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-100",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            }
          />
        </div>

        {isPlanner ? (
          <PlannerChanakyaLiveTicker items={chanakyaLiveItems} />
        ) : null}

        <TasksWorkspaceSummaryStrip
          summary={model.summary}
          onOpenMeetings={() => setTab("planner")}
        />

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col rounded-lg border border-white/10 bg-[#0c1320]/90",
            "shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_-30px_rgba(0,0,0,0.8)]",
            isPlanner ? "p-2 sm:p-2.5" : "p-3 sm:p-4",
            isPlanner && "min-h-[calc(100vh-11.5rem)]",
          )}
        >
          {tab === "tasks" ? (
            <TasksExecutionDesk
              view={model.execution}
              actorRef={actorRef}
              onOpenTask={openTask}
              onChanged={refresh}
              onCreate={openCreatePlain}
            />
          ) : (
            <TasksPlannerDesk
              snapshot={model.planner}
              actorRef={actorRef}
              userRef={userRef}
              canManageTeam={teamScope}
              onViewModeChange={setPlannerView}
              onFocusDateChange={setFocusDate}
              onSelectEvent={onSelectPlannerEvent}
              onCreateIntent={openCreateFromPlanner}
              onContextAction={handlePlannerContextAction}
              onChanged={refresh}
            />
          )}
        </div>
      </div>

      <QuickTaskCreateModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setCreateIntent(null);
            setCreateDueOn(null);
            refresh();
          }
        }}
        allowEntityPicker
        defaultDueOn={createDueOn}
        defaultTitle={createIntent?.defaultTitle}
        defaultWorkType={createIntent?.workType}
        defaultPredefinedDescription={createIntent?.predefinedDescription}
        intentLabel={createIntent?.label}
      />

      <TaskDetailDrawer
        task={detailTask}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) refresh();
        }}
        onUpdated={refresh}
      />

      <PlannerEventPreview
        event={previewEvent}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        actorRef={actorRef}
        onChanged={refresh}
        onRequestReschedule={(event) => {
          setRescheduleEvent(event);
          setRescheduleOpen(true);
        }}
      />

      <PlannerRescheduleDialog
        key={rescheduleEvent?.id ?? "none"}
        event={rescheduleEvent}
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        actorRef={actorRef}
        onChanged={refresh}
      />
    </div>
  );
}
