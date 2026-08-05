/**
 * CO-TASKS-PLANNER-003 — Planner workspace create intents (ETE only).
 */

import { ETE_PREDEFINED_DESCRIPTIONS } from "@/constants/enterprise-task-engine";
import type { EtePredefinedDescription, EteWorkType } from "@/types/enterprise-task-engine";

export type PlannerCreateIntentId =
  | "add_task"
  | "schedule_meeting"
  | "add_follow_up"
  | "block_time"
  | "add_reminder"
  | "personal_task";

export type PlannerCreateIntent = {
  id: PlannerCreateIntentId;
  label: string;
  defaultTitle: string;
  workType: EteWorkType;
  predefinedDescription: EtePredefinedDescription;
  /** Independent (personal) vs opportunity-capable workflow */
  independent: boolean;
};

export const PLANNER_CREATE_INTENTS: PlannerCreateIntent[] = [
  {
    id: "add_task",
    label: "Add Task",
    defaultTitle: "New task",
    workType: "Custom",
    predefinedDescription: ETE_PREDEFINED_DESCRIPTIONS.CUSTOM,
    independent: false,
  },
  {
    id: "schedule_meeting",
    label: "Schedule Meeting",
    defaultTitle: "Customer meeting",
    workType: "Customer Call",
    predefinedDescription: ETE_PREDEFINED_DESCRIPTIONS.CUSTOMER_MEETING,
    independent: false,
  },
  {
    id: "add_follow_up",
    label: "Add Follow-up",
    defaultTitle: "Follow-up",
    workType: "Follow-up",
    predefinedDescription: ETE_PREDEFINED_DESCRIPTIONS.CALL_CUSTOMER,
    independent: false,
  },
  {
    id: "block_time",
    label: "Block Time",
    defaultTitle: "Blocked time",
    workType: "Internal Review",
    predefinedDescription: ETE_PREDEFINED_DESCRIPTIONS.INTERNAL_REVIEW,
    independent: true,
  },
  {
    id: "add_reminder",
    label: "Add Reminder",
    defaultTitle: "Reminder",
    workType: "Reminder",
    predefinedDescription: ETE_PREDEFINED_DESCRIPTIONS.GENERAL,
    independent: true,
  },
  {
    id: "personal_task",
    label: "Create Personal Task",
    defaultTitle: "Personal task",
    workType: "Custom",
    predefinedDescription: ETE_PREDEFINED_DESCRIPTIONS.GENERAL,
    independent: true,
  },
];

export const PLANNER_SCOPE_FILTERS = [
  { id: "mine" as const, label: "My Tasks" },
  { id: "team" as const, label: "Team Tasks" },
] as const;

export type PlannerScopeFilter = (typeof PLANNER_SCOPE_FILTERS)[number]["id"];
