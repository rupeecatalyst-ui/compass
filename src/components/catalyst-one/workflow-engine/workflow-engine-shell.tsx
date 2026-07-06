"use client";

import { useRef } from "react";
import { attachCommandBarScrollState, WorkspaceCommandBarLayout } from "@/components/catalyst-one/shared/catalyst-command-bar";
import { WorkflowCommandBar } from "@/components/catalyst-one/workflow-engine/workflow-command-bar";
import { WorkflowSideNav } from "@/components/catalyst-one/workflow-engine/workflow-side-nav";
import { cn } from "@/lib/utils";

interface WorkflowEngineShellProps {
  title: string;
  description?: string;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function WorkflowEngineShell(props: WorkflowEngineShellProps) {
  const { children, className, ...barProps } = props;
  const commandBarRef = useRef<HTMLDivElement>(null);

  return (
    <WorkspaceCommandBarLayout
      className={cn("h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)]", className)}
      commandBar={
        <div ref={commandBarRef}>
          <WorkflowCommandBar {...barProps} />
        </div>
      }
      onBodyScroll={(e) => attachCommandBarScrollState(commandBarRef.current, e.currentTarget.scrollTop)}
    >
      <div className="flex min-h-full">
        <aside className="hidden w-52 shrink-0 lg:block xl:w-56">
          <WorkflowSideNav className="sticky top-0 h-full min-h-[calc(100vh-8rem)]" />
        </aside>
        <div className="min-w-0 flex-1 p-4 sm:p-5 lg:p-6">{children}</div>
      </div>
    </WorkspaceCommandBarLayout>
  );
}
