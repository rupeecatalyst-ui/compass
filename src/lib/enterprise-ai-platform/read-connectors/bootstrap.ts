/**
 * Bootstrap AI-4 Read Connectors layer onto the frozen platform.
 */

import { ensureEaiReadConnectorsRegistered } from "./registry";
import { registerEaiEnterpriseReadTools } from "./register-tools";
import { wireEaiContextProvidersToReadConnectors } from "./wire-providers";
import { ensureEaiContextProviderStubs } from "../context-intelligence/providers";

/**
 * Ensure stubs exist, then overlay connector-backed providers and register read tools.
 */
export function bootstrapEaiReadConnectorsLayer(): void {
  ensureEaiContextProviderStubs();
  ensureEaiReadConnectorsRegistered();
  wireEaiContextProvidersToReadConnectors();
  registerEaiEnterpriseReadTools();
}
