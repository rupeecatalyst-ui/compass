/**
 * Security Operations Center — Mission Control.
 * Executive security workspace UI. No auth / MFA / audit execution.
 */

export type * from "./types";
export {
  createSecurityProvider,
  createThreatProvider,
  createComplianceProvider,
  createIdentityProvider,
} from "./providers";
export type {
  SecurityProvider,
  ThreatProvider,
  ComplianceProvider,
  IdentityProvider,
} from "./providers";
export { SecurityOperationsCenter } from "./SecurityOperationsCenter";
export * as SecurityOperationsComponents from "./components";
