"use client";

import {
  ClipboardList,
  FileUp,
  MessageSquare,
  Building2,
  History,
  GitBranch,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OwGlassPanel, OwSectionLabel } from "./workspace-design";
import { useOpportunityWorkspace, type WorkspaceFocus } from "./opportunity-workspace-context";

const ACTIONS: Array<{
  label: string;
  focus: WorkspaceFocus;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { label: "Add Task", focus: "tasks", icon: ClipboardList },
  { label: "Upload Document", focus: "documents", icon: FileUp },
  { label: "Open Dialogue", focus: "dialogue", icon: MessageSquare },
  { label: "Select Lender", focus: "life", icon: Building2 },
  { label: "Workflow", focus: "workflow", icon: Workflow },
  { label: "View Timeline", focus: "timeline", icon: History },
  { label: "Change Stage", focus: "stage", icon: GitBranch },
];

export function WorkspaceQuickActions() {
  const { focus, setFocus } = useOpportunityWorkspace();

  return (
    <OwGlassPanel>
      <OwSectionLabel>Quick Actions</OwSectionLabel>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          const active = focus === action.focus;
          return (
            <button
              key={action.focus}
              type="button"
              onClick={() => setFocus(action.focus)}
              className={cn(
                "group flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-xl border px-3 py-3 text-center transition-all duration-200",
                active
                  ? "border-teal-500/50 bg-teal-500/15 shadow-md shadow-teal-900/20"
                  : "border-white/10 bg-zinc-950/40 hover:border-teal-500/30 hover:bg-teal-500/5",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform duration-200 group-hover:scale-110",
                  active ? "text-teal-300" : "text-zinc-400",
                )}
              />
              <span className="text-xs font-medium text-zinc-100">{action.label}</span>
            </button>
          );
        })}
      </div>
    </OwGlassPanel>
  );
}
