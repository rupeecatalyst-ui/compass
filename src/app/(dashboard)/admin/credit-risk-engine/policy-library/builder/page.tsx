"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getDurablePolicy, type DurablePolicyRecord } from "@/lib/credit-risk-engine/durable-policy-admin";
import { PolicyBuilderForm } from "@/components/catalyst-one/credit-risk-engine/policy-library/policy-builder-form";

function PolicyBuilderPageContent() {
  const searchParams = useSearchParams();
  const policyId = searchParams.get("policyId");
  const [policy, setPolicy] = useState<DurablePolicyRecord>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (!policyId) return;
    let active = true;
    void getDurablePolicy(policyId).then(record => { if (active) setPolicy(record); })
      .catch(() => { if (active) setError("Durable policy could not be loaded."); });
    return () => { active = false; };
  }, [policyId]);

  if (error) return <p role="alert" className="p-6 text-destructive">{error}</p>;
  if (policyId && (!policy || policy.policyId !== policyId)) return <p role="status" className="p-6">Loading durable policy…</p>;

  return (
    <PolicyBuilderForm
      initialPolicy={policy}
      initialRuleRefs={policy?.ruleRefs ?? []}
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
