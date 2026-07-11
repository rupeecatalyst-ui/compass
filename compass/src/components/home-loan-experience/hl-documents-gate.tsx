"use client";

import { useDiscovery } from "@/components/home-loan-experience/discovery/discovery-context";
import { HlDocumentsCompact } from "@/components/home-loan-experience/hl-documents-compact";

/** Documentation appears only after Sarathi — post-intent, compact, reassuring. */
export function HlDocumentsGate() {
  const { sarathiActivated } = useDiscovery();
  if (!sarathiActivated) return null;
  return <HlDocumentsCompact />;
}
