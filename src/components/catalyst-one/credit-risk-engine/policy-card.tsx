"use client";

import Link from "next/link";
import {
  Archive,
  Copy,
  Eye,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import {
  formatPolicyVersion,
  POLICY_LIFECYCLE_LABELS,
  POLICY_STATUS_PILL_VARIANT,
} from "@/constants/credit-risk-engine";
import { ROUTES } from "@/constants/routes";
import type { CreditRiskPolicySummary } from "@/types/credit-risk-engine";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface PolicyCardProps {
  policy: CreditRiskPolicySummary;
  className?: string;
}

export function PolicyCard({ policy, className }: PolicyCardProps) {
  const version = formatPolicyVersion(policy.majorVersion, policy.minorVersion);
  const detailHref = `${ROUTES.ADMIN_CREDIT_RISK_POLICY_LIBRARY}/${policy.policyId}`;
  const editHref = `${ROUTES.ADMIN_CREDIT_RISK_POLICY_BUILDER}?policyId=${policy.policyId}`;

  const effectiveDate = policy.effectiveFrom
    ? new Date(policy.effectiveFrom).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  const lastUpdated = new Date(policy.lastModified).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Card className={cn("glass-card border-border/60 transition-all hover:border-primary/25 hover:shadow-md", className)}>
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-semibold">{policy.policyName}</p>
            <p className="text-xs text-muted-foreground">{policy.lenderName}</p>
          </div>
          <StatusPill variant={POLICY_STATUS_PILL_VARIANT[policy.status]}>
            {POLICY_LIFECYCLE_LABELS[policy.status]}
          </StatusPill>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <MetaField label="Product" value={policy.productName} />
          <MetaField label="Version" value={version} mono />
          <MetaField label="Effective" value={effectiveDate} />
          <MetaField label="Updated" value={lastUpdated} />
        </div>
      </CardHeader>
      <CardContent className="pb-3 pt-0">
        <p className="font-mono text-[10px] text-muted-foreground">{policy.policyCode}</p>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 border-t border-border/50 pt-3">
        <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2 text-xs" asChild>
          <Link href={detailHref}>
            <Eye className="h-3 w-3" />
            View
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2 text-xs" asChild>
          <Link href={editHref}>
            <Pencil className="h-3 w-3" />
            Edit
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2 text-xs" disabled title="Clone — future sprint">
          <Copy className="h-3 w-3" />
          Clone
        </Button>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2 text-xs" disabled title="Archive — use detail view lifecycle">
          <Archive className="h-3 w-3" />
          Archive
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-auto h-7 w-7">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={detailHref}>View</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={editHref}>Edit</Link>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>Clone</DropdownMenuItem>
            <DropdownMenuItem disabled>Archive</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}

function MetaField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={cn("truncate font-medium", mono && "font-mono")}>{value}</p>
    </div>
  );
}
