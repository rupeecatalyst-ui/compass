"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getRuleById } from "@/lib/credit-risk-engine/rule-store";
import { RuleBuilderForm } from "@/components/catalyst-one/credit-risk-engine/rule-library/rule-builder-form";

function RuleBuilderPageContent() {
  const searchParams = useSearchParams();
  const ruleId = searchParams.get("ruleId");
  const initialRule = ruleId ? getRuleById(ruleId) : undefined;

  return <RuleBuilderForm initialRule={initialRule} />;
}

export default function RuleBuilderPage() {
  return (
    <Suspense fallback={null}>
      <RuleBuilderPageContent />
    </Suspense>
  );
}
