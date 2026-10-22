"use client";

import { useEffect, useRef } from "react";
import {
  clearDiscoveryLaunchUrl,
  COMPASS_LAUNCH_DISCOVERY_EVENT,
  shouldAutoLaunchDiscovery,
} from "@/discovery-template/launch-discovery";
import { campaignLandingRedirect, rememberCampaignToken } from "@/lib/campaign-entry";
import { readProductCodeFromPathname } from "@/config/compass-lending-products";
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
    const redirect = campaignLandingRedirect(window.location.pathname, window.location.search);
    if (redirect) {
      const product = readProductCodeFromPathname(window.location.pathname, window.location.search);
      const token = new URLSearchParams(window.location.search).get("campaign")?.trim();
      if (product && token) rememberCampaignToken(window.sessionStorage, product, token);
      autoLaunched.current = true;
      window.location.replace(redirect);
      return;
    }
    if (!shouldAutoLaunchDiscovery()) return;
    autoLaunched.current = true;
    clearDiscoveryLaunchUrl();
    launchDiscovery();
  }, [launchDiscovery]);

  return null;
}
