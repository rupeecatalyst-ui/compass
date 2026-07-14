"use client";

import { useRef } from "react";
import {
  attachCommandBarScrollState,
  WorkspaceCommandBarLayout,
} from "@/components/catalyst-one/shared/catalyst-command-bar";
import { WorkspaceShellChrome } from "@/components/catalyst-one/shared/workspace-shell-chrome";
import { EflSideNav } from "@/components/catalyst-one/enterprise-foundation-libraries/efl-side-nav";
import { WORKSPACE_CLOSE } from "@/constants/workspace-navigation";
import { cn } from "@/lib/utils";

interface EflShellProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function EflShell({ title, description, actions, children, className }: EflShellProps) {
  const commandBarRef = useRef<HTMLDivElement>(null);

  return (
    <WorkspaceCommandBarLayout
      className={cn("h-[calc(100vh-4rem)]", className)}
      workspaceHeader={
        <WorkspaceShellChrome
          workspaceName="Foundation Libraries"
          closeTo={WORKSPACE_CLOSE.DASHBOARD}
        />
      }
      commandBar={
        <div
          ref={commandBarRef}
          className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-sm sm:px-5"
        >
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight">{title}</h1>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {actions}
        </div>
      }
      onBodyScroll={(e) =>
        attachCommandBarScrollState(commandBarRef.current, e.currentTarget.scrollTop)
      }
    >
      <div className="flex min-h-full">
        <aside className="hidden w-52 shrink-0 lg:block xl:w-56">
          <EflSideNav className="sticky top-0 h-full min-h-[calc(100vh-8rem)]" />
        </aside>
        <div className="min-w-0 flex-1 p-4 sm:p-5 lg:p-6">{children}</div>
      </div>
    </WorkspaceCommandBarLayout>
  );
}
