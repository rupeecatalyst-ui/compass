"use client";

import { useCallback } from "react";
import { useDiscoveryOptional } from "@/components/home-loan-experience/discovery/discovery-context";
import { resolveLaunchProductCode } from "@/config/compass-lending-products";
import {
  dispatchLaunchDiscovery,
  discoveryLaunchUrl,
} from "@/discovery-template/launch-discovery";
import { ROUTES } from "@/constants/routes";

type ProductRoute = (typeof ROUTES)[keyof typeof ROUTES];

/** Launch discovery overlay — never scroll to a page section. */
export function useLaunchDiscovery(productPath: ProductRoute) {
  const discovery = useDiscoveryOptional();

  return useCallback(() => {
    if (discovery) {
      const resolved = resolveLaunchProductCode(productPath);
      discovery.launchDiscovery(resolved ?? undefined);
      return;
    }

    if (typeof window !== "undefined" && window.location.pathname === productPath) {
      dispatchLaunchDiscovery();
      return;
    }

    if (typeof window !== "undefined") {
      window.location.assign(discoveryLaunchUrl(productPath));
    }
  }, [discovery, productPath]);
}
