/**
 * CO-ARCH-001-I5a — Reference Master port wiring.
 * CO-ARCH-009 — Client-safe. PostgreSQL sync lives in sync-from-prisma.server.ts.
 */
import {
  isEnterpriseMastersDualReadEnabled,
  isReferenceMasterPortRuntimeActive,
} from "@/constants/enterprise-master-data/dual-read";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import type { ReferenceMasterPort } from "@/types/reference-master-port";
import { constantsReferenceMasterPort } from "./ports/constants-port";
import { dualReadReferenceMasterPort } from "./ports/dual-read-port";
import { clearReferenceMasterPortCache } from "./ports/cache-store";

let activePort: ReferenceMasterPort = constantsReferenceMasterPort;
let masterPortsConfigured = false;

export function getReferenceMasterPort(): ReferenceMasterPort {
  return activePort;
}

export function configureReferenceMasterPorts(): void {
  if (masterPortsConfigured) return;
  if (isEnterprisePersistencePrisma() && isEnterpriseMastersDualReadEnabled()) {
    activePort = dualReadReferenceMasterPort;
  } else {
    activePort = constantsReferenceMasterPort;
  }
  masterPortsConfigured = true;
}

export function resetReferenceMasterPorts(): void {
  activePort = constantsReferenceMasterPort;
  masterPortsConfigured = false;
  clearReferenceMasterPortCache();
}

export {
  isEnterpriseMastersDualReadEnabled,
  isReferenceMasterPortRuntimeActive,
};
