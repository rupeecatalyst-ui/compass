/**
 * Read connector registry (CO-AI-104).
 */

import type {
  EaiReadConnector,
  EaiReadConnectorId,
} from "@/types/enterprise-ai-read-connectors";
import { createDefaultEaiReadConnectors } from "./connectors";

const connectors = new Map<EaiReadConnectorId, EaiReadConnector>();
let ensured = false;

export function ensureEaiReadConnectorsRegistered(): void {
  if (ensured && connectors.size > 0) return;
  for (const c of createDefaultEaiReadConnectors()) {
    connectors.set(c.connectorId, c);
  }
  ensured = true;
}

export function resetEaiReadConnectors(): void {
  connectors.clear();
  ensured = false;
}

export function registerEaiReadConnector(connector: EaiReadConnector): void {
  if (!connector.readOnly) {
    throw new Error("Only read-only connectors may be registered");
  }
  connectors.set(connector.connectorId, connector);
}

export function getEaiReadConnector(
  connectorId: EaiReadConnectorId,
): EaiReadConnector | undefined {
  ensureEaiReadConnectorsRegistered();
  return connectors.get(connectorId);
}

export function listEaiReadConnectors(): EaiReadConnector[] {
  ensureEaiReadConnectorsRegistered();
  return [...connectors.values()];
}
