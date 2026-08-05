"use client";

/**
 * CO-UX-016 — Shared Enterprise Registry page chrome.
 * Locked viewport · compact header · sticky filter/toolbar slot · fill table area.
 * Presentation layer only.
 *
 * CO-LW-003: optional `layoutMode="document"` for operational desks that need
 * natural page scroll (no viewport height lock / nested overflow trap).
 */

import type { ReactNode } from "react";
import { WorkspaceExitNav } from "@/components/enterprise/navigation";
import type { BreadcrumbItem } from "@/types/navigation";
import {
  ENTERPRISE_REGISTRY_CONTENT_PAD_CLASS,
  ENTERPRISE_REGISTRY_COUNT_CLASS,
  ENTERPRISE_REGISTRY_DOCUMENT_CONTENT_PAD_CLASS,
  ENTERPRISE_REGISTRY_DOCUMENT_VIEWPORT_CLASS,
  ENTERPRISE_REGISTRY_HEADER_CLASS,
  ENTERPRISE_REGISTRY_SUBTITLE_CLASS,
  ENTERPRISE_REGISTRY_TITLE_CLASS,
  ENTERPRISE_REGISTRY_VIEWPORT_CLASS,
  formatEnterpriseRegistryCounter,
} from "@/constants/enterprise-registry-workspace";
import { cn } from "@/lib/utils";

export interface EnterpriseRegistryWorkspaceShellProps {
  title: string;
  /** Short subtitle — shown inline after title on sm+ */
  subtitle?: string;
  /** Record count for concise counter */
  count?: number;
  /** Override counter noun (default = title) */
  countNoun?: string;
  ofTotal?: number;
  /** Optional badge / SSOT chip next to title */
  statusSlot?: ReactNode;
  /** Compact action buttons (Reload, Add, …) */
  actions?: ReactNode;
  /** Optional exit breadcrumbs */
  breadcrumbs?: BreadcrumbItem[];
  /** Sticky filter / search strip above the data area */
  toolbar?: ReactNode;
  /** Primary registry body (table) — must fill remaining height */
  children: ReactNode;
  /** Banner / error above toolbar */
  banner?: ReactNode;
  /**
   * fill (default) — locked viewport for dense registry tables.
   * document — natural page scroll for operational multi-panel desks.
   */
  layoutMode?: "fill" | "document";
  className?: string;
  "data-surface"?: string;
  "data-sprint"?: string;
}

export function EnterpriseRegistryWorkspaceShell({
  title,
  subtitle,
  count,
  countNoun,
  ofTotal,
  statusSlot,
  actions,
  breadcrumbs,
  toolbar,
  children,
  banner,
  layoutMode = "fill",
  className,
  "data-surface": dataSurface,
  "data-sprint": dataSprint,
}: EnterpriseRegistryWorkspaceShellProps) {
  const counter =
    count != null
      ? formatEnterpriseRegistryCounter(countNoun ?? title, count, {
          ofTotal,
        })
      : null;

  const documentScroll = layoutMode === "document";

  return (
    <div
      className={cn(
        documentScroll
          ? ENTERPRISE_REGISTRY_DOCUMENT_VIEWPORT_CLASS
          : ENTERPRISE_REGISTRY_VIEWPORT_CLASS,
        className,
      )}
      data-sprint={dataSprint ?? "CO-UX-DATAGRID-001"}
      data-surface={dataSurface ?? "enterprise-registry"}
      data-layout-mode={layoutMode}
    >
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <WorkspaceExitNav breadcrumbs={breadcrumbs} className="shrink-0" />
      ) : null}

      <div
        className={
          documentScroll
            ? ENTERPRISE_REGISTRY_DOCUMENT_CONTENT_PAD_CLASS
            : ENTERPRISE_REGISTRY_CONTENT_PAD_CLASS
        }
      >
        <header className={ENTERPRISE_REGISTRY_HEADER_CLASS}>
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <h1 className={ENTERPRISE_REGISTRY_TITLE_CLASS}>{title}</h1>
            {subtitle ? (
              <span className={ENTERPRISE_REGISTRY_SUBTITLE_CLASS}>· {subtitle}</span>
            ) : null}
            {statusSlot}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {counter ? <p className={ENTERPRISE_REGISTRY_COUNT_CLASS}>{counter}</p> : null}
            {actions}
          </div>
        </header>

        {banner}

        {toolbar ? (
          <div className="sticky top-0 z-20 shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            {toolbar}
          </div>
        ) : null}

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            documentScroll ? "overflow-visible" : "overflow-hidden",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
