"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { getCreditRiskPolicyById } from "@/lib/credit-risk-engine/policy-store";
import { PolicyDetailView } from "@/components/catalyst-one/credit-risk-engine/policy-library/policy-detail-view";
import { CreditRiskEngineShell } from "@/components/catalyst-one/credit-risk-engine/credit-risk-engine-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";

function PolicyDetailPageContent() {
  const params = useParams();
  const policyId = params.policyId as string;
  const policy = getCreditRiskPolicyById(policyId);

  if (!policy) {
    return (
      <CreditRiskEngineShell title="Policy Not Found" description="The requested policy does not exist.">
        <Card className="glass-card mx-auto max-w-md border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Policy not found</CardTitle>
          </CardHeader>
          <CardContent>
            <Button size="sm" asChild>
              <Link href={ROUTES.ADMIN_CREDIT_RISK_POLICY_LIBRARY}>Back to Policy Library</Link>
            </Button>
          </CardContent>
        </Card>
      </CreditRiskEngineShell>
    );
  }

  return <PolicyDetailView policy={policy} />;
}

export default function PolicyDetailPage() {
  return (
    <Suspense fallback={null}>
      <PolicyDetailPageContent />
    </Suspense>
  );
}
