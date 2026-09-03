"use client";

import { Suspense } from "react";
import { StickyNotesWorkspace } from "@/components/catalyst-one/sticky-notes/sticky-notes-workspace";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

export default function StickyNotesPage() {
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="tasks"
          statusLabel="Opening Sticky Notes..."
          density="panel"
        />
      }
    >
      <StickyNotesWorkspace />
    </Suspense>
  );
}
