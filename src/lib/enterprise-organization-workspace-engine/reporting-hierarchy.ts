/**
 * EOWE reporting hierarchy utilities.
 */

import type { EowePositionRecord } from "@/types/enterprise-organization-workspace-engine";
import { getEowePorts } from "./composition";

export function getEoweReportingChain(positionId: string): EowePositionRecord[] {
  const chain: EowePositionRecord[] = [];
  const visited = new Set<string>();
  let current = getEowePorts().hierarchy.findById(positionId);

  while (current && current.nodeType === "position") {
    if (visited.has(current.id)) break;
    visited.add(current.id);
    chain.push(current as EowePositionRecord);
    const reportsTo = (current as EowePositionRecord).reportsToPositionId;
    if (!reportsTo) break;
    current = getEowePorts().hierarchy.findById(reportsTo);
  }

  return chain;
}

export function listEoweDirectReports(positionId: string): EowePositionRecord[] {
  return getEowePorts()
    .hierarchy.list()
    .filter(
      (n): n is EowePositionRecord =>
        n.nodeType === "position" && (n as EowePositionRecord).reportsToPositionId === positionId,
    );
}
