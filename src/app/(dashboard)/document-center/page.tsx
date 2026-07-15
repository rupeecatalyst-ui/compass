"use client";

import { Suspense } from "react";
import { DocumentCenterWorkspace } from "@/components/catalyst-one/document-center/document-center-workspace";

export default function DocumentCenterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
        </div>
      }
    >
      <DocumentCenterWorkspace />
    </Suspense>
  );
}
