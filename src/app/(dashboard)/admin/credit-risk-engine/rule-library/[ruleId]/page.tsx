"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { getRuleById } from "@/lib/credit-risk-engine/rule-store";
import { RuleDetailView } from "@/components/catalyst-one/credit-risk-engine/rule-library/rule-detail-view";
import { CreditRiskEngineShell } from "@/components/catalyst-one/credit-risk-engine/credit-risk-engine-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";

function RuleDetailPageContent() {
  const params = useParams();
  const ruleId = params.ruleId as string;
  const rule = getRuleById(ruleId);

  if (!rule) {
    return (
      <CreditRiskEngineShell title="Rule Not Found" description="The requested rule does not exist.">
        <Card className="glass-card mx-auto max-w-md border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Rule not found</CardTitle>
          </CardHeader>
          <CardContent>
            <Button size="sm" asChild>
              <Link href={ROUTES.ADMIN_CREDIT_RISK_RULE_LIBRARY}>Back to Rule Library</Link>
            </Button>
          </CardContent>
        </Card>
      </CreditRiskEngineShell>
    );
  }

  return <RuleDetailView rule={rule} />;
}

export default function RuleDetailPage() {
  return (
    <Suspense fallback={null}>
      <RuleDetailPageContent />
    </Suspense>
  );
}
