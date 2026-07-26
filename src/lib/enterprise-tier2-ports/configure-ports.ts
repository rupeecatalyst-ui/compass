/**
 * CO-ARCH-001-I5b — Tier 2 Business Registry port wiring.
 * CO-ARCH-009 — Client-safe. PostgreSQL sync lives in sync-from-prisma.server.ts.
 */
import { isEnterpriseMastersDualReadEnabled } from "@/constants/enterprise-master-data/dual-read";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import type {
  DocumentRegistryPort,
  LenderRegistryPort,
  ProductRegistryPort,
} from "@/types/tier2-registry-port";
import { clearTier2RegistryPortCache } from "./ports/cache-store";
import { constantsDocumentRegistryPort } from "./ports/document-constants-port";
import { constantsLenderRegistryPort } from "./ports/lender-constants-port";
import { constantsProductRegistryPort } from "./ports/product-constants-port";
import {
  dualReadDocumentRegistryPort,
  dualReadLenderRegistryPort,
  dualReadProductRegistryPort,
} from "./ports/dual-read-ports";

let activeProductPort: ProductRegistryPort = constantsProductRegistryPort;
let activeDocumentPort: DocumentRegistryPort = constantsDocumentRegistryPort;
let activeLenderPort: LenderRegistryPort = constantsLenderRegistryPort;
let tier2PortsConfigured = false;

export function getProductRegistryPort(): ProductRegistryPort {
  return activeProductPort;
}

export function getDocumentRegistryPort(): DocumentRegistryPort {
  return activeDocumentPort;
}

export function getLenderRegistryPort(): LenderRegistryPort {
  return activeLenderPort;
}

export function configureTier2RegistryPorts(): void {
  if (tier2PortsConfigured) return;
  if (isEnterprisePersistencePrisma() && isEnterpriseMastersDualReadEnabled()) {
    activeProductPort = dualReadProductRegistryPort;
    activeDocumentPort = dualReadDocumentRegistryPort;
    activeLenderPort = dualReadLenderRegistryPort;
  } else {
    activeProductPort = constantsProductRegistryPort;
    activeDocumentPort = constantsDocumentRegistryPort;
    activeLenderPort = constantsLenderRegistryPort;
  }
  tier2PortsConfigured = true;
}

export function resetTier2RegistryPorts(): void {
  activeProductPort = constantsProductRegistryPort;
  activeDocumentPort = constantsDocumentRegistryPort;
  activeLenderPort = constantsLenderRegistryPort;
  tier2PortsConfigured = false;
  clearTier2RegistryPortCache();
}
