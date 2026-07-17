"use client";

import { useRouter } from "next/navigation";
import { WorkspaceHeader } from "@/components/catalyst-one/shared/workspace-header";
import { EnterpriseWorkspaceShell } from "@/components/catalyst-one/shared/enterprise-workspace-shell";

export interface WorkspaceShellChromeProps {
  /** Standard workspace title shown in the header bar (e.g. "Product Library"). */
  workspaceName?: string;
  /** Route or handler when Close is confirmed. */
  closeTo?: string;
  hasUnsavedChanges?: boolean;
  onSaveAndClose?: () => void | Promise<void>;
  acknowledgeCleanClose?: boolean;
}

/** Renders the standard workspace header for route-based shells. */
export function WorkspaceShellChrome({
  workspaceName,
  closeTo,
  hasUnsavedChanges,
  onSaveAndClose,
  acknowledgeCleanClose,
}: WorkspaceShellChromeProps) {
  const router = useRouter();

  if (!workspaceName || !closeTo) return null;

  return (
    <WorkspaceHeader
      title={workspaceName}
      onClose={() => router.push(closeTo)}
      hasUnsavedChanges={hasUnsavedChanges}
      onSaveAndClose={onSaveAndClose}
      acknowledgeCleanClose={acknowledgeCleanClose}
    />
  );
}

export { EnterpriseWorkspaceShell };
