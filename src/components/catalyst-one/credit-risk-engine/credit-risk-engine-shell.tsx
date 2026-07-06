"use client";

import { useRef } from "react";
import {
  attachCommandBarScrollState,
  WorkspaceCommandBarLayout,
} from "@/components/catalyst-one/shared/catalyst-command-bar";
import { CreditRiskCommandBar } from "@/components/catalyst-one/credit-risk-engine/credit-risk-command-bar";
import { CreditRiskSideNav } from "@/components/catalyst-one/credit-risk-engine/credit-risk-side-nav";
import {
  WorkspaceShellChrome,
  type WorkspaceShellChromeProps,
} from "@/components/catalyst-one/shared/workspace-shell-chrome";
import { cn } from "@/lib/utils";

interface CreditRiskEngineShellProps extends WorkspaceShellChromeProps {
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

/** CRC-10.3A.1 — Enterprise workspace shell with sticky command bar + module side nav. */
export function CreditRiskEngineShell({
  title,
  description,
  showSearch,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  actions,
  children,
  className,
  workspaceName,
  closeTo,
  hasUnsavedChanges,
  onSaveAndClose,
}: CreditRiskEngineShellProps) {
  const commandBarRef = useRef<HTMLDivElement>(null);

  return (
    <WorkspaceCommandBarLayout
      className={cn("h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)]", className)}
      workspaceHeader={
        workspaceName && closeTo ? (
          <WorkspaceShellChrome
            workspaceName={workspaceName}
            closeTo={closeTo}
            hasUnsavedChanges={hasUnsavedChanges}
            onSaveAndClose={onSaveAndClose}
          />
        ) : null
      }
      commandBar={
        <div ref={commandBarRef}>
          <CreditRiskCommandBar
            title={title}
            description={description}
            showSearch={showSearch}
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            searchPlaceholder={searchPlaceholder}
            actions={actions}
          />
        </div>
      }
      onBodyScroll={(e) => {
        attachCommandBarScrollState(commandBarRef.current, e.currentTarget.scrollTop);
      }}
    >
      <div className="flex min-h-full">
        <aside className="hidden w-52 shrink-0 lg:block xl:w-56">
          <CreditRiskSideNav className="sticky top-0 h-full min-h-[calc(100vh-8rem)]" />
        </aside>
        <div className="min-w-0 flex-1 p-4 sm:p-5 lg:p-6">{children}</div>
      </div>
    </WorkspaceCommandBarLayout>
  );
}
