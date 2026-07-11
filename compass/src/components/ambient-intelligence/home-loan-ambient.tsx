"use client";

import { AmbientIntelligence } from "@/components/ambient-intelligence/ambient-intelligence";
import { resolveAmbientContext } from "@/components/ambient-intelligence/resolve-ambient-context";
import { useDiscovery } from "@/components/home-loan-experience/discovery/discovery-context";

/** Ambient insights during the discovery overlay — context follows journey step. */
export function DiscoveryAmbientIntelligence() {
  const { step, answers, sarathiActivated } = useDiscovery();
  const context = resolveAmbientContext(step, answers, sarathiActivated);

  return <AmbientIntelligence context={context} variant="overlay" enabled />;
}

/** Ambient insights on the scroll page when discovery is closed. */
export function PageAmbientIntelligence() {
  const { isOpen, answers, sarathiActivated, journeyComplete } = useDiscovery();

  if (isOpen) return null;

  const context = journeyComplete && sarathiActivated ? "application" : resolveAmbientContext(null, answers, sarathiActivated);

  return (
    <div className="pointer-events-none fixed bottom-8 left-0 right-0 z-40 hidden sm:block">
      <AmbientIntelligence context={context} variant="page" enabled />
    </div>
  );
}
