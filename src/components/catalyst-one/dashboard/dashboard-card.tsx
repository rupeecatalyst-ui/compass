import { cn } from "@/lib/utils";

interface DashboardCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

/** Dense dark-themed card shell for Executive Command Centre */
export function DashboardCard({ children, className, ...props }: DashboardCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-800/80 bg-slate-900/50 backdrop-blur-sm shadow-sm",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface DashboardCardHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function DashboardCardHeader({ title, description, action, className }: DashboardCardHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-4 pt-4 pb-2", className)}>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-slate-100 tracking-tight">{title}</h3>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function DashboardCardContent({ children, className }: DashboardCardProps) {
  return <div className={cn("px-4 pb-4", className)}>{children}</div>;
}
