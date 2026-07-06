"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  getCreditRiskPolicyById,
  getPolicyRuleReferences,
} from "@/lib/credit-risk-engine/policy-store";
import { PolicyBuilderForm } from "@/components/catalyst-one/credit-risk-engine/policy-library/policy-builder-form";

function PolicyBuilderPageContent() {
  const searchParams = useSearchParams();
  const policyId = searchParams.get("policyId");
  const policy = policyId ? getCreditRiskPolicyById(policyId) : undefined;
  const ruleRefs = policyId ? getPolicyRuleReferences(policyId) : [];

  return (
    <PolicyBuilderForm
      initialPolicy={policy}
      initialRuleRefs={ruleRefs}
    />
  );
}

export default function PolicyBuilderPage() {
  return (
    <Suspense fallback={null}>
      <PolicyBuilderPageContent />
    </Suspense>
  );
}
