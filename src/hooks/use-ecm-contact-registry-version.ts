"use client";

import { useSyncExternalStore } from "react";
import {
  getEcmContactRegistryVersion,
  subscribeEcmContactRegistry,
} from "@/lib/enterprise-contact-master/contact-change-bus";

/**
 * Subscribe to ECM Contact Registry mutations.
 * Bump this version in useMemo deps so lists/counts recompute after Save
 * without page reload or manual refresh.
 */
export function useEcmContactRegistryVersion(): number {
  return useSyncExternalStore(
    subscribeEcmContactRegistry,
    getEcmContactRegistryVersion,
    getEcmContactRegistryVersion,
  );
}
