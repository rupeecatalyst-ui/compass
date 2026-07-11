"use client";

import { useEffect, useRef } from "react";
import {
  clearDiscoveryLaunchUrl,
  COMPASS_LAUNCH_DISCOVERY_EVENT,
  shouldAutoLaunchDiscovery,
} from "@/discovery-template/launch-discovery";
import { useDiscovery } from "@/components/home-loan-experience/discovery/discovery-context";

/** Converts legacy hash/query links into overlay launch — never scroll to sections. */
export function DiscoveryLaunchBridge() {
  const { launchDiscovery } = useDiscovery();
  const autoLaunched = useRef(false);

  useEffect(() => {
    const onLaunch = () => launchDiscovery();
    window.addEventListener(COMPASS_LAUNCH_DISCOVERY_EVENT, onLaunch);
    return () => window.removeEventListener(COMPASS_LAUNCH_DISCOVERY_EVENT, onLaunch);
  }, [launchDiscovery]);

  useEffect(() => {
    if (autoLaunched.current) return;
    if (!shouldAutoLaunchDiscovery()) return;
    autoLaunched.current = true;
    clearDiscoveryLaunchUrl();
    launchDiscovery();
  }, [launchDiscovery]);

  return null;
}
