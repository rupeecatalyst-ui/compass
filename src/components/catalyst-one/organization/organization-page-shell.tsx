import { CatalystBranding } from "@/components/catalyst-one/catalyst-branding";
import { PageHeader } from "@/components/design-system/page-header";
import { StatusPill } from "@/components/design-system/status-pill";
import { cn } from "@/lib/utils";

interface OrganizationPageShellProps {
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function OrganizationPageShell({
  title,
  description,
  actions,
  children,
  className,
}: OrganizationPageShellProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <CatalystBranding variant="compact" />
            <StatusPill variant="default">Organization · Internal</StatusPill>
          </div>
          <PageHeader title={title} description={description} actions={actions} />
        </div>
      </div>
      {children}
    </div>
  );
}
