"use client";

import { Suspense } from "react";
import { LeadInformationWorkspace } from "@/components/catalyst-one/lead-information/lead-information-workspace";

export default function LeadInformationPage() {
  return (
    <Suspense fallback={null}>
      <LeadInformationWorkspace />
    </Suspense>
  );
}
