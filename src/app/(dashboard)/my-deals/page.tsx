"use client";

import { Suspense } from "react";
import { MyDealsWorkspace } from "@/components/catalyst-one/my-deals";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

export default function MyDealsPage() {
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="deal"
          statusLabel="Opening My Deals…"
          density="panel"
        />
      }
    >
      <MyDealsWorkspace />
    </Suspense>
  );
}
