"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Search,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import { ETE_PREDEFINED_DESCRIPTIONS, ETE_TASK_TYPES } from "@/constants/enterprise-task-engine";
import { ROUTES } from "@/constants/routes";
import {
  TASK_COMMITMENT_OPTIONS,
  TASK_POSTPONE_REASONS,
  TASK_TIMELINE_COLUMNS,
  assigneeLabel,
  columnForTask,
  completeEteTask,
  dueDateForColumn,
  enrichTaskDefaults,
  escalateEteOverdueTasks,
  isPostponeMove,
  listEteTasks,
  loadTaskNotifications,
  patchEteTask,
  pushTaskNotification,
  registerEteTask,
  resolveTaskCategory,
  taskTitle,
  type TaskPostponeNotification,
  type TaskTimelineColumnId,
} from "@/lib/enterprise-task-engine";
import type {
  EteCommitmentLevel,
  EtePostponeReason,
  EteTask,
  EteTaskCategory,
  EteTaskPriority,
} from "@/types/enterprise-task-engine";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { isDemoSeedEnabled } from "@/lib/demo-seed";
import { TaskCommitmentDialog } from "@/components/catalyst-one/tasks/task-commitment-dialog";
import { TaskDetailDrawer } from "@/components/catalyst-one/tasks/task-detail-drawer";
import { ChanakyaMark } from "@/components/layout/chanakya-mark";

const PREDEFINED = Object.values(ETE_PREDEFINED_DESCRIPTIONS);

const FILTER_ALL = "__all__";

type Filters = {
  category: EteTaskCategory | typeof FILTER_ALL;
  assignee: string;
  assignedBy: string;
  department: string;
  customer: string;
  loanProduct: string;
  lender: string;
  priority: EteTaskPriority | typeof FILTER_ALL;
  status: "open" | "completed" | typeof FILTER_ALL;
  dateFrom: string;
  dateTo: string;
};

const DEFAULT_FILTERS: Filters = {
  category: FILTER_ALL,
  assignee: FILTER_ALL,
  assignedBy: FILTER_ALL,
  department: FILTER_ALL,
  customer: FILTER_ALL,
  loanProduct: FILTER_ALL,
  lender: FILTER_ALL,
  priority: FILTER_ALL,
  status: "open",
  dateFrom: "",
  dateTo: "",
};

function seedEnterpriseTasksIfEmpty() {
  if (!isDemoSeedEnabled()) return;
  if (listEteTasks().length > 0) return;
  const now = Date.now();
  const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString();

  const seeds: Parameters<typeof registerEteTask>[0][] = [
    {
      taskType: ETE_TASK_TYPES.OPPORTUNITY,
      category: "workflow",
      assigneeRef: "employee:rm-001",
      opportunityRef: "opp-demo-001",
      predefinedDescription: ETE_PREDEFINED_DESCRIPTIONS.FOLLOW_UP_DOCUMENTS,
      dueOn: iso(2 * 60 * 60 * 1000),
      reportingManagerRef: "employee:mgr-001",
      assignedByRef: "employee:mgr-001",
      borrowerName: "Priya Nair",
      loanProduct: "Home Loan",
      lenderName: "HDFC Bank",
      grossStage: "Document Center",
      priority: "high",
      createdBy: "system",
    },
    {
      taskType: ETE_TASK_TYPES.OPPORTUNITY,
      category: "workflow",
      assigneeRef: "employee:rm-001",
      opportunityRef: "opp-demo-002",
      predefinedDescription: ETE_PREDEFINED_DESCRIPTIONS.FOLLOW_UP_LENDER,
      dueOn: iso(-26 * 60 * 60 * 1000),
      reportingManagerRef: "employee:mgr-001",
      assignedByRef: "employee:mgr-001",
      borrowerName: "Arjun Mehta",
      loanProduct: "LAP",
      lenderName: "ICICI Bank",
      grossStage: "Lender Pipeline",
      priority: "high",
      createdBy: "system",
    },
    {
      taskType: ETE_TASK_TYPES.OPPORTUNITY,
      category: "workflow",
      assigneeRef: "employee:rm-001",
      opportunityRef: "opp-demo-003",
      predefinedDescription: ETE_PREDEFINED_DESCRIPTIONS.CUSTOMER_MEETING,
      dueOn: iso(26 * 60 * 60 * 1000),
      assignedByRef: "employee:mgr-001",
      borrowerName: "Sneha Kapoor",
      loanProduct: "Personal Loan",
      grossStage: "Opportunity Workspace",
      priority: "medium",
      createdBy: "system",
    },
    {
      taskType: ETE_TASK_TYPES.OPPORTUNITY,
      category: "workflow",
      assigneeRef: "employee:ops-001",
      opportunityRef: "opp-demo-004",
      predefinedDescription: ETE_PREDEFINED_DESCRIPTIONS.VERIFY_CIBIL,
      dueOn: iso(4 * 24 * 60 * 60 * 1000),
      assignedByRef: "employee:mgr-001",
      borrowerName: "Vikram Shah",
      loanProduct: "Home Loan BT",
      lenderName: "SBI",
      grossStage: "Credit Workbench",
      priority: "medium",
      createdBy: "system",
    },
    {
      taskType: ETE_TASK_TYPES.INDEPENDENT,
      category: "general",
      assigneeRef: "employee:ops-001",
      predefinedDescription: ETE_PREDEFINED_DESCRIPTIONS.INTERNAL_REVIEW,
      description: "Weekly ops standup prep",
      dueOn: iso(10 * 24 * 60 * 60 * 1000),
      department: "Operations",
      assignedByRef: "employee:mgr-001",
      priority: "low",
      createdBy: "system",
    },
    {
      taskType: ETE_TASK_TYPES.INDEPENDENT,
      category: "general",
      assigneeRef: "employee:hr-001",
      predefinedDescription: ETE_PREDEFINED_DESCRIPTIONS.CUSTOM,
      description: "HR policy walkthrough",
      dueOn: iso(20 * 24 * 60 * 60 * 1000),
      department: "HR",
      assignedByRef: "employee:mgr-001",
      priority: "medium",
      createdBy: "system",
    },
    {
      taskType: ETE_TASK_TYPES.INDEPENDENT,
      category: "general",
      assigneeRef: "employee:ops-001",
      predefinedDescription: ETE_PREDEFINED_DESCRIPTIONS.GENERAL,
      description: "Office administration — vendor invoice",
      dueOn: iso(40 * 24 * 60 * 60 * 1000),
      department: "Administration",
      assignedByRef: "employee:mgr-001",
      priority: "low",
      createdBy: "system",
    },
    {
      taskType: ETE_TASK_TYPES.INDEPENDENT,
      category: "general",
      assigneeRef: "employee:rm-001",
      predefinedDescription: ETE_PREDEFINED_DESCRIPTIONS.CUSTOM,
      description: "Compliance checklist Q2",
      department: "Compliance",
      assignedByRef: "employee:mgr-001",
      priority: "high",
      createdBy: "system",
    },
  ];

  for (const seed of seeds) {
    registerEteTask(seed);
  }
}

/**
 * CO-SPRINT-088 — Enterprise Task Workspace.
 * Global execution hub (Workflow + General). Independent of Loan Workspace chrome.
 */
export function TaskEngineWorkspace() {
  const [tasks, setTasks] = useState<EteTask[]>([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [dragOverCol, setDragOverCol] = useState<TaskTimelineColumnId | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifications, setNotifications] = useState<TaskPostponeNotification[]>([]);
  const [pendingPostpone, setPendingPostpone] = useState<{
    taskId: string;
    from: TaskTimelineColumnId;
    to: TaskTimelineColumnId;
    dueOn?: string;
  } | null>(null);
  const boardScrollRef = useRef<HTMLDivElement>(null);

  const [taskType, setTaskType] = useState<EteTask["taskType"]>(ETE_TASK_TYPES.INDEPENDENT);
  const [assignee, setAssignee] = useState("employee:rm-001");
  const [predefined, setPredefined] = useState<EteTask["predefinedDescription"]>(
    ETE_PREDEFINED_DESCRIPTIONS.CALL_CUSTOMER,
  );
  const [customDescription, setCustomDescription] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const refresh = () => {
    setTasks(listEteTasks().map(enrichTaskDefaults));
    setNotifications(loadTaskNotifications());
  };

  useEffect(() => {
    seedEnterpriseTasksIfEmpty();
    escalateEteOverdueTasks("system");
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      const enriched = enrichTaskDefaults(t);
      const category = resolveTaskCategory(enriched);
      if (filters.status === "open" && !t.enabled) return false;
      if (filters.status === "completed" && t.enabled) return false;
      if (filters.category !== FILTER_ALL && category !== filters.category) return false;
      if (filters.assignee !== FILTER_ALL && t.assigneeRef !== filters.assignee) return false;
      if (
        filters.assignedBy !== FILTER_ALL &&
        (enriched.assignedByRef ?? t.createdBy) !== filters.assignedBy
      )
        return false;
      if (filters.department !== FILTER_ALL && (enriched.department ?? "") !== filters.department)
        return false;
      if (filters.customer !== FILTER_ALL && (enriched.borrowerName ?? "") !== filters.customer)
        return false;
      if (filters.loanProduct !== FILTER_ALL && (enriched.loanProduct ?? "") !== filters.loanProduct)
        return false;
      if (filters.lender !== FILTER_ALL && (enriched.lenderName ?? "") !== filters.lender)
        return false;
      if (filters.priority !== FILTER_ALL && (enriched.priority ?? "medium") !== filters.priority)
        return false;
      if (filters.dateFrom && t.dueOn && new Date(t.dueOn) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && t.dueOn && new Date(t.dueOn) > new Date(`${filters.dateTo}T23:59:59`))
        return false;
      if (!q) return true;
      const hay = [
        taskTitle(enriched),
        enriched.borrowerName,
        enriched.lenderName,
        enriched.department,
        enriched.description,
        assigneeLabel(t.assigneeRef),
        assigneeLabel(enriched.assignedByRef ?? t.createdBy),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [tasks, search, filters]);

  const grouped = useMemo(() => {
    const map = Object.fromEntries(TASK_TIMELINE_COLUMNS.map((c) => [c.id, [] as EteTask[]])) as Record<
      TaskTimelineColumnId,
      EteTask[]
    >;
    for (const t of filtered.filter((x) => x.enabled || filters.status === "completed")) {
      if (!t.enabled && filters.status !== "completed") continue;
      if (t.enabled) map[columnForTask(t)].push(t);
      else map.no_schedule.push(t);
    }
    return map;
  }, [filtered, filters.status]);

  const insights = useMemo(() => {
    const open = tasks.filter((t) => t.enabled);
    const today = open.filter((t) => columnForTask(t) === "due_today").length;
    const overdue = open.filter((t) => columnForTask(t) === "past_due").length;
    const workflowHot = open.filter(
      (t) => resolveTaskCategory(t) === "workflow" && (columnForTask(t) === "past_due" || columnForTask(t) === "due_today"),
    ).length;
    const lines: string[] = [];
    if (today > 0) lines.push(`You have ${today} task${today === 1 ? "" : "s"} today.`);
    if (overdue > 0) lines.push(`${overdue === 1 ? "One task is" : `${overdue} tasks are`} overdue.`);
    if (workflowHot > 0)
      lines.push(
        `${workflowHot === 1 ? "One workflow task requires" : `${workflowHot} workflow tasks require`} immediate attention.`,
      );
    if (lines.length === 0) lines.push("All clear — no urgent timeline pressure.");
    return lines.slice(0, 3);
  }, [tasks]);

  const selectedTask = useMemo(
    () => (selectedId ? tasks.find((t) => t.id === selectedId) ?? null : null),
    [selectedId, tasks],
  );

  const uniqueOptions = useMemo(() => {
    const assignees = new Set<string>();
    const assignedBy = new Set<string>();
    const departments = new Set<string>();
    const customers = new Set<string>();
    const products = new Set<string>();
    const lenders = new Set<string>();
    for (const t of tasks) {
      const e = enrichTaskDefaults(t);
      assignees.add(t.assigneeRef);
      assignedBy.add(e.assignedByRef ?? t.createdBy);
      if (e.department) departments.add(e.department);
      if (e.borrowerName) customers.add(e.borrowerName);
      if (e.loanProduct) products.add(e.loanProduct);
      if (e.lenderName) lenders.add(e.lenderName);
    }
    return { assignees, assignedBy, departments, customers, products, lenders };
  }, [tasks]);

  const applyMove = (
    taskId: string,
    to: TaskTimelineColumnId,
    commitment?: {
      commitmentLevel: EteCommitmentLevel;
      postponeReason: EtePostponeReason;
      postponeComment?: string;
    },
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const from = columnForTask(task);
    if (from === to) return;
    const nextDue = dueDateForColumn(to);
    patchEteTask(
      taskId,
      {
        dueOn: nextDue,
        ...(commitment
          ? {
              commitmentLevel: commitment.commitmentLevel,
              postponeReason: commitment.postponeReason,
              postponeComment: commitment.postponeComment,
            }
          : {}),
      },
      "ui",
    );

    if (commitment) {
      const enriched = enrichTaskDefaults(task);
      const category = resolveTaskCategory(enriched);
      const timelineLabel = TASK_TIMELINE_COLUMNS.find((c) => c.id === to)?.label ?? to;
      const commitmentLabel =
        TASK_COMMITMENT_OPTIONS.find((o) => o.id === commitment.commitmentLevel)?.label ??
        commitment.commitmentLevel;
      const reasonLabel =
        TASK_POSTPONE_REASONS.find((o) => o.id === commitment.postponeReason)?.label ??
        commitment.postponeReason;

      pushTaskNotification({
        taskId,
        taskName: taskTitle(enriched),
        category,
        borrowerName: category === "workflow" ? enriched.borrowerName : undefined,
        loanProduct: category === "workflow" ? enriched.loanProduct : undefined,
        lenderName: category === "workflow" ? enriched.lenderName : undefined,
        grossStage: category === "workflow" ? enriched.grossStage : undefined,
        newTimeline: timelineLabel,
        commitmentLevel: commitmentLabel,
        reasonCategory: reasonLabel,
        comment: commitment.postponeComment,
        assignedByRef: enriched.assignedByRef ?? task.createdBy,
      });
    }

    toast.success("Task Rescheduled Successfully.");
    refresh();
  };

  const handleDrop = (e: React.DragEvent, to: TaskTimelineColumnId) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggingId;
    setDragOverCol(null);
    setDraggingId(null);
    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.enabled) return;
    const from = columnForTask(task);
    if (from === to) return;
    if (isPostponeMove(from, to)) {
      setPendingPostpone({ taskId, from, to, dueOn: dueDateForColumn(to) });
      return;
    }
    applyMove(taskId, to);
  };

  const onCreate = () => {
    setCreateError(null);
    try {
      const isWorkflow = taskType === ETE_TASK_TYPES.OPPORTUNITY;
      registerEteTask({
        taskType,
        category: isWorkflow ? "workflow" : "general",
        assigneeRef: assignee,
        opportunityRef: isWorkflow ? "opp-demo-001" : undefined,
        predefinedDescription: predefined,
        description: predefined === ETE_PREDEFINED_DESCRIPTIONS.CUSTOM ? customDescription : undefined,
        dueOn: dueOn ? new Date(dueOn).toISOString() : undefined,
        reportingManagerRef: "employee:mgr-001",
        assignedByRef: "employee:mgr-001",
        borrowerName: isWorkflow ? "Demo Customer" : undefined,
        loanProduct: isWorkflow ? "Home Loan" : undefined,
        department: isWorkflow ? undefined : "Operations",
        grossStage: isWorkflow ? "Loan Workspace" : undefined,
        priority: "medium",
        createdBy: "ui",
      });
      setCreateOpen(false);
      refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create task");
    }
  };

  const unreadNotify = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col gap-4">
      <PageHeader
        title="Enterprise Task Workspace"
        description="Organization execution hub — workflow and general tasks in one Kanban."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="relative h-9 gap-1.5"
              onClick={() => setNotifyOpen(true)}
            >
              <Bell className="h-3.5 w-3.5" />
              Notifications
              {unreadNotify > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                  {unreadNotify}
                </span>
              ) : null}
            </Button>
            <Button type="button" className="h-9 gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Create Task
            </Button>
          </div>
        }
      />

      {/* Minimal CHANAKYA */}
      <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/15 px-3 py-2.5">
        <ChanakyaMark className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {insights.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search task, borrower, lender, assignee, department, description…"
            className="h-9 pl-8 text-xs"
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-10">
          <FilterSelect
            label="Type"
            value={filters.category}
            onChange={(v) => setFilters((f) => ({ ...f, category: v as Filters["category"] }))}
            options={[
              { value: FILTER_ALL, label: "All types" },
              { value: "workflow", label: "Workflow" },
              { value: "general", label: "General" },
            ]}
          />
          <FilterSelect
            label="Assigned To"
            value={filters.assignee}
            onChange={(v) => setFilters((f) => ({ ...f, assignee: v }))}
            options={[
              { value: FILTER_ALL, label: "Anyone" },
              ...[...uniqueOptions.assignees].map((a) => ({ value: a, label: assigneeLabel(a) })),
            ]}
          />
          <FilterSelect
            label="Assigned By"
            value={filters.assignedBy}
            onChange={(v) => setFilters((f) => ({ ...f, assignedBy: v }))}
            options={[
              { value: FILTER_ALL, label: "Anyone" },
              ...[...uniqueOptions.assignedBy].map((a) => ({ value: a, label: assigneeLabel(a) })),
            ]}
          />
          <FilterSelect
            label="Department"
            value={filters.department}
            onChange={(v) => setFilters((f) => ({ ...f, department: v }))}
            options={[
              { value: FILTER_ALL, label: "All" },
              ...[...uniqueOptions.departments].map((d) => ({ value: d, label: d })),
            ]}
          />
          <FilterSelect
            label="Customer"
            value={filters.customer}
            onChange={(v) => setFilters((f) => ({ ...f, customer: v }))}
            options={[
              { value: FILTER_ALL, label: "All" },
              ...[...uniqueOptions.customers].map((d) => ({ value: d, label: d })),
            ]}
          />
          <FilterSelect
            label="Product"
            value={filters.loanProduct}
            onChange={(v) => setFilters((f) => ({ ...f, loanProduct: v }))}
            options={[
              { value: FILTER_ALL, label: "All" },
              ...[...uniqueOptions.products].map((d) => ({ value: d, label: d })),
            ]}
          />
          <FilterSelect
            label="Lender"
            value={filters.lender}
            onChange={(v) => setFilters((f) => ({ ...f, lender: v }))}
            options={[
              { value: FILTER_ALL, label: "All" },
              ...[...uniqueOptions.lenders].map((d) => ({ value: d, label: d })),
            ]}
          />
          <FilterSelect
            label="Priority"
            value={filters.priority}
            onChange={(v) => setFilters((f) => ({ ...f, priority: v as Filters["priority"] }))}
            options={[
              { value: FILTER_ALL, label: "All" },
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
            ]}
          />
          <FilterSelect
            label="Status"
            value={filters.status}
            onChange={(v) => setFilters((f) => ({ ...f, status: v as Filters["status"] }))}
            options={[
              { value: FILTER_ALL, label: "All" },
              { value: "open", label: "Open" },
              { value: "completed", label: "Completed" },
            ]}
          />
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] text-muted-foreground">Date range</Label>
            <div className="flex gap-1">
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                className="h-8 text-[10px]"
              />
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                className="h-8 text-[10px]"
              />
            </div>
          </div>
        </div>
        {(search ||
          filters.category !== FILTER_ALL ||
          filters.assignee !== FILTER_ALL ||
          filters.status !== FILTER_ALL) && (
          <button
            type="button"
            className="self-start text-[11px] text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => {
              setSearch("");
              setFilters(DEFAULT_FILTERS);
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Kanban — primary workspace */}
      <div
        ref={boardScrollRef}
        className="flex min-h-0 flex-1 gap-2 overflow-x-auto pb-2"
      >
        {TASK_TIMELINE_COLUMNS.map((col) => {
          const isOver = dragOverCol === col.id;
          return (
            <div
              key={col.id}
              className={cn(
                "flex w-[260px] shrink-0 flex-col rounded-xl border bg-muted/15",
                isOver && "border-primary/50 bg-primary/5",
              )}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOverCol(col.id);
              }}
              onDragLeave={() => setDragOverCol((c) => (c === col.id ? null : c))}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="flex items-center justify-between border-b border-border/60 px-2.5 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {col.label}
                </p>
                <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium tabular-nums">
                  {grouped[col.id].length}
                </span>
              </div>
              <div className="flex max-h-[calc(100vh-22rem)] min-h-[420px] flex-col gap-2 overflow-y-auto p-2">
                {grouped[col.id].map((task) => (
                  <TaskCard
                    key={task.id}
                    task={enrichTaskDefaults(task)}
                    dragging={draggingId === task.id}
                    onOpen={() => setSelectedId(task.id)}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", task.id);
                      e.dataTransfer.effectAllowed = "move";
                      setDraggingId(task.id);
                    }}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDragOverCol(null);
                    }}
                    onComplete={() => {
                      completeEteTask(task.id, "ui");
                      refresh();
                      toast.success("Task completed.");
                    }}
                    onQuickNote={() => {
                      setSelectedId(task.id);
                      toast.message("Add a note in the task drawer.");
                    }}
                  />
                ))}
                {grouped[col.id].length === 0 && (
                  <p className="px-2 py-8 text-center text-[11px] text-muted-foreground">
                    {isOver ? "Drop here" : "No tasks"}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <TaskDetailDrawer
        task={selectedTask ? enrichTaskDefaults(selectedTask) : null}
        open={Boolean(selectedId)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        onUpdated={refresh}
      />

      <TaskCommitmentDialog
        open={Boolean(pendingPostpone)}
        onOpenChange={(open) => {
          if (!open) setPendingPostpone(null);
        }}
        taskName={(() => {
          if (!pendingPostpone) return "";
          const t = tasks.find((x) => x.id === pendingPostpone.taskId);
          return t ? taskTitle(enrichTaskDefaults(t)) : "";
        })()}
        newTimelineLabel={
          TASK_TIMELINE_COLUMNS.find((c) => c.id === pendingPostpone?.to)?.label ?? ""
        }
        onConfirm={(data) => {
          if (!pendingPostpone) return;
          applyMove(pendingPostpone.taskId, pendingPostpone.to, data);
          setPendingPostpone(null);
        }}
      />

      {/* Notifications */}
      <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
        <DialogContent className="sm:max-w-lg" allowOutsideClose>
          <DialogHeader>
            <DialogTitle className="text-sm">Task notifications</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <article
                  key={n.id}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-xs",
                    n.read ? "border-border/50 opacity-70" : "border-primary/30 bg-primary/5",
                  )}
                >
                  <p className="font-semibold">{n.taskName}</p>
                  <p className="mt-1 text-muted-foreground">
                    Rescheduled to <span className="font-medium text-foreground">{n.newTimeline}</span>
                    {" · "}
                    {n.commitmentLevel} · {n.reasonCategory}
                  </p>
                  {n.category === "workflow" ? (
                    <p className="mt-1 text-muted-foreground">
                      {[n.borrowerName, n.loanProduct, n.lenderName, n.grossStage]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                  {n.comment ? <p className="mt-1 italic text-muted-foreground">{n.comment}</p> : null}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      onClick={() => {
                        setSelectedId(n.taskId);
                        setNotifyOpen(false);
                      }}
                    >
                      View Task
                    </Button>
                    {n.category === "workflow" ? (
                      <Button asChild size="sm" variant="ghost" className="h-7 text-[11px]">
                        <Link href={ROUTES.LOAN_FILES}>Open Loan Workspace</Link>
                      </Button>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg" allowOutsideClose>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={taskType} onValueChange={(v) => setTaskType(v as EteTask["taskType"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ETE_TASK_TYPES.INDEPENDENT}>General Task</SelectItem>
                  <SelectItem value={ETE_TASK_TYPES.OPPORTUNITY}>Workflow Task</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Select
                value={predefined}
                onValueChange={(v) => setPredefined(v as EteTask["predefinedDescription"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PREDEFINED.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {predefined === ETE_PREDEFINED_DESCRIPTIONS.CUSTOM && (
              <div className="space-y-1.5">
                <Label>Custom text</Label>
                <Input
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Assignee</Label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee:rm-001">Rahul Sharma</SelectItem>
                  <SelectItem value="employee:ops-001">Ops Desk</SelectItem>
                  <SelectItem value="employee:hr-001">HR Desk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due</Label>
              <Input type="datetime-local" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
            </div>
            {createError && <p className="text-xs text-destructive">{createError}</p>}
            <Button type="button" onClick={onCreate}>
              Create Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-[11px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function TaskCard({
  task,
  dragging,
  onOpen,
  onDragStart,
  onDragEnd,
  onComplete,
  onQuickNote,
}: {
  task: EteTask;
  dragging: boolean;
  onOpen: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onComplete: () => void;
  onQuickNote: () => void;
}) {
  const category = resolveTaskCategory(task);
  const isWorkflow = category === "workflow";

  return (
    <article
      draggable={task.enabled}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={cn(
        "cursor-grab rounded-lg border p-2.5 shadow-sm active:cursor-grabbing",
        isWorkflow
          ? "border-sky-300/70 bg-sky-50/80 dark:border-sky-700/50 dark:bg-sky-950/40"
          : "border-amber-300/70 bg-amber-50/90 dark:border-amber-700/50 dark:bg-amber-950/35",
        dragging && "opacity-60",
        !task.enabled && "opacity-50",
      )}
    >
      <p className="text-[13px] font-semibold leading-snug text-foreground">{taskTitle(task)}</p>
      <dl className="mt-1.5 space-y-0.5 text-[10px] text-muted-foreground">
        {isWorkflow ? (
          <>
            <MiniRow label="Borrower" value={task.borrowerName ?? "—"} />
            <MiniRow label="Product" value={task.loanProduct ?? "—"} />
            {task.lenderName ? <MiniRow label="Lender" value={task.lenderName} /> : null}
          </>
        ) : (
          <>
            <MiniRow label="Department" value={task.department ?? "—"} />
            <MiniRow label="Assigned By" value={assigneeLabel(task.assignedByRef ?? task.createdBy)} />
          </>
        )}
        <MiniRow label="Assigned To" value={assigneeLabel(task.assigneeRef)} />
        <MiniRow
          label="Due"
          value={
            task.dueOn
              ? new Date(task.dueOn).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                })
              : "—"
          }
        />
        <MiniRow label="Priority" value={(task.priority ?? "medium").toUpperCase()} />
      </dl>

      <div
        className="mt-2 flex flex-wrap gap-1"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <IconAction
          title="Call"
          onClick={() => toast.message("Calling… (demo)")}
          icon={<Phone className="h-3 w-3" />}
        />
        <IconAction
          title="WhatsApp"
          onClick={() => toast.message("WhatsApp… (demo)")}
          icon={<MessageSquare className="h-3 w-3" />}
        />
        <IconAction
          title="Email"
          onClick={() => toast.message("Email… (demo)")}
          icon={<Mail className="h-3 w-3" />}
        />
        <IconAction title="Add Note" onClick={onQuickNote} icon={<StickyNote className="h-3 w-3" />} />
        {task.enabled ? (
          <IconAction title="Complete Task" onClick={onComplete} icon={<Check className="h-3 w-3" />} />
        ) : null}
      </div>
    </article>
  );
}

function MiniRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground/80">{label}</dt>
      <dd className="truncate text-right font-medium text-foreground/90">{value}</dd>
    </div>
  );
}

function IconAction({
  title,
  onClick,
  icon,
}: {
  title: string;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-6 w-6 items-center justify-center rounded border border-border/60 bg-background/80 text-muted-foreground hover:text-foreground"
    >
      {icon}
    </button>
  );
}
