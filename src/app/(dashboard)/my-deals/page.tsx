"use client";

import { Suspense } from "react";
import { MyDealsWorkspace } from "@/components/catalyst-one/my-deals";

export default function MyDealsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading My Deals…</div>}>
      <MyDealsWorkspace />
    </Suspense>
  );
}
