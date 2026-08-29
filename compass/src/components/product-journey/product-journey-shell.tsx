"use client";

import { AnimatePresence } from "framer-motion";
import { DiscoveryJourney } from "@/components/home-loan-experience/discovery/discovery-journey";
import { DiscoveryLaunchBridge } from "@/components/home-loan-experience/discovery/discovery-launch-bridge";
import {
  DiscoveryProvider,
  useDiscovery,
} from "@/components/home-loan-experience/discovery/discovery-context";

function DiscoveryOverlay() {
  const { isOpen, launchKey } = useDiscovery();
  return (
    <AnimatePresence mode="wait">
      {isOpen ? <DiscoveryJourney key={launchKey} /> : null}
    </AnimatePresence>
  );
}

/** Shared COMPASS discovery overlay for every product route. */
export function ProductJourneyShell({ children }: { children: React.ReactNode }) {
  return (
    <DiscoveryProvider>
      <DiscoveryLaunchBridge />
      {children}
      <DiscoveryOverlay />
    </DiscoveryProvider>
  );
}
