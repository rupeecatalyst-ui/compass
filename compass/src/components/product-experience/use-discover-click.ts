"use client";

import { useReducedMotion } from "framer-motion";
import { useLaunchDiscovery } from "@/discovery-template/use-launch-discovery";
import { ROUTES } from "@/constants/routes";

type ProductRoute = (typeof ROUTES)[keyof typeof ROUTES];

/** @deprecated Use useLaunchDiscovery — launches overlay instead of scrolling. */
export function scrollToConversation(event?: React.MouseEvent<HTMLAnchorElement>) {
  event?.preventDefault();
}

export function useDiscoverClick(productPath: ProductRoute = ROUTES.HOME_LOAN) {
  const launchDiscovery = useLaunchDiscovery(productPath);
  const reduceMotion = useReducedMotion();

  return (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (!reduceMotion) {
      window.dispatchEvent(new CustomEvent("compass:navigate", { detail: { to: "discovery" } }));
    }
    launchDiscovery();
  };
}
