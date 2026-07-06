"use client";

import { useRef } from "react";
import {
  attachCommandBarScrollState,
  WorkspaceCommandBarLayout,
} from "@/components/catalyst-one/shared/catalyst-command-bar";
import { ArchitectureCommandBar } from "@/components/catalyst-one/architecture/architecture-command-bar";
import { ArchitectureSideNav } from "@/components/catalyst-one/architecture/architecture-side-nav";
import { cn } from "@/lib/utils";

interface ArchitectureShellProps {
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

/** CARB v1 — Enterprise architecture workspace shell. Design-time only. */
export function ArchitectureShell({
  title,
  description,
  showSearch,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  actions,
  children,
  className,
}: ArchitectureShellProps) {
  const commandBarRef = useRef<HTMLDivElement>(null);

  return (
    <WorkspaceCommandBarLayout
      className={cn("h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)]", className)}
      commandBar={
        <div ref={commandBarRef}>
          <ArchitectureCommandBar
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
          <ArchitectureSideNav className="sticky top-0 h-full min-h-[calc(100vh-8rem)]" />
        </aside>
        <div className="min-w-0 flex-1 p-4 sm:p-5 lg:p-6">{children}</div>
      </div>
    </WorkspaceCommandBarLayout>
  );
}
