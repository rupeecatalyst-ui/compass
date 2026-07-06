"use client";

import { useRef } from "react";
import { attachCommandBarScrollState, WorkspaceCommandBarLayout } from "@/components/catalyst-one/shared/catalyst-command-bar";
import { EalCommandBar } from "@/components/catalyst-one/enterprise-asset-library/eal-command-bar";
import { EalSideNav } from "@/components/catalyst-one/enterprise-asset-library/eal-side-nav";
import {
  WorkspaceShellChrome,
  type WorkspaceShellChromeProps,
} from "@/components/catalyst-one/shared/workspace-shell-chrome";
import { WORKSPACE_CLOSE } from "@/constants/workspace-navigation";
import { cn } from "@/lib/utils";

interface EalShellProps extends WorkspaceShellChromeProps {
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

export function EalShell(props: EalShellProps) {
  const {
    children,
    className,
    workspaceName = "Enterprise Asset Library",
    closeTo = WORKSPACE_CLOSE.DASHBOARD,
    hasUnsavedChanges,
    onSaveAndClose,
    ...barProps
  } = props;
  const commandBarRef = useRef<HTMLDivElement>(null);

  return (
    <WorkspaceCommandBarLayout
      className={cn("h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)]", className)}
      workspaceHeader={
        <WorkspaceShellChrome
          workspaceName={workspaceName}
          closeTo={closeTo}
          hasUnsavedChanges={hasUnsavedChanges}
          onSaveAndClose={onSaveAndClose}
        />
      }
      commandBar={
        <div ref={commandBarRef}>
          <EalCommandBar {...barProps} />
        </div>
      }
      onBodyScroll={(e) => attachCommandBarScrollState(commandBarRef.current, e.currentTarget.scrollTop)}
    >
      <div className="flex min-h-full">
        <aside className="hidden w-52 shrink-0 lg:block xl:w-56">
          <EalSideNav className="sticky top-0 h-full min-h-[calc(100vh-8rem)]" />
        </aside>
        <div className="min-w-0 flex-1 p-4 sm:p-5 lg:p-6">{children}</div>
      </div>
    </WorkspaceCommandBarLayout>
  );
}
