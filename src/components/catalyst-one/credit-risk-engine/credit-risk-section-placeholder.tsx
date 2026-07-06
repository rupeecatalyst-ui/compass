"use client";

import { Construction } from "lucide-react";
import { getCreditRiskNavItem } from "@/config/credit-risk-navigation";
import { CreditRiskEngineShell } from "@/components/catalyst-one/credit-risk-engine/credit-risk-engine-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/design-system/status-pill";
import type { CreditRiskEngineSectionId } from "@/types/credit-risk-engine";

interface CreditRiskSectionPlaceholderProps {
  sectionId: CreditRiskEngineSectionId;
}

export function CreditRiskSectionPlaceholder({ sectionId }: CreditRiskSectionPlaceholderProps) {
  const navItem = getCreditRiskNavItem(sectionId);
  const title = navItem?.title ?? "Section";
  const description = navItem?.description ?? "Module placeholder.";

  return (
    <CreditRiskEngineShell title={title} description={description}>
      <Card className="glass-card mx-auto max-w-2xl border-border/60">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Construction className="h-7 w-7 text-muted-foreground" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <StatusPill variant="warning">Foundation Sprint — No Business Logic</StatusPill>
          <p className="text-sm text-muted-foreground">
            This section is reserved for Sprint 10.3A.1 architecture. Configuration, calculations
            and rule engines will be implemented in upcoming sprints.
          </p>
        </CardContent>
      </Card>
    </CreditRiskEngineShell>
  );
}
