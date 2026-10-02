"use client";

import { useEffect } from "react";
import { useDiscovery } from "@/components/home-loan-experience/discovery/discovery-context";

/**
 * Generic entry for a published Catalyst One product journey.
 * The product code selects the definition. The published journey decides the questions.
 */
export default function ApplyProductJourneyPage() {
  const { launchDiscovery } = useDiscovery();

  useEffect(() => {
    launchDiscovery();
  }, [launchDiscovery]);

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Your application</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        This journey is loaded from the published Catalyst One configuration.
      </p>
    </main>
  );
}
