import {
  GitBranch,
  LayoutDashboard,
  Library,
  Radio,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import type { WorkflowEngineSectionId } from "@/types/workflow-engine";

export interface WorkflowNavItem {
  id: WorkflowEngineSectionId;
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

export const WORKFLOW_ENGINE_NAV: WorkflowNavItem[] = [
  {
    id: "overview",
    title: "Overview",
    href: ROUTES.ADMIN_WORKFLOW_ENGINE,
    icon: LayoutDashboard,
    description: "Workflow Engine executive dashboard and platform metrics.",
  },
  {
    id: "registry",
    title: "Workflow Registry",
    href: ROUTES.ADMIN_WORKFLOW_REGISTRY,
    icon: Library,
    description: "Browse metadata-driven workflow definitions across all modules.",
  },
  {
    id: "stage-library",
    title: "Stage Library",
    href: ROUTES.ADMIN_WORKFLOW_STAGE_LIBRARY,
    icon: GitBranch,
    description: "Reusable stage and sub-stage masters for workflow composition.",
  },
  {
    id: "events",
    title: "Events & SLA",
    href: ROUTES.ADMIN_WORKFLOW_EVENTS,
    icon: Radio,
    description: "Event definitions, SLA and escalation metadata.",
  },
  {
    id: "settings",
    title: "Settings",
    href: ROUTES.ADMIN_WORKFLOW_SETTINGS,
    icon: Settings,
    description: "Assignment strategies and engine configuration.",
  },
];

export const WORKFLOW_ENGINE_ICON = GitBranch;

export function getWorkflowNavItem(id: WorkflowEngineSectionId): WorkflowNavItem | undefined {
  return WORKFLOW_ENGINE_NAV.find((item) => item.id === id);
}
