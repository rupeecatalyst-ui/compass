/**
 * Security category taxonomy.
 */

import type { SecurityCategory } from "../contracts";

export const SECURITY_FRAMEWORK_CATEGORIES: readonly SecurityCategory[] = [
  {
    id: "identity",
    label: "Identity",
    description: "Directory and principal posture",
    icon: "Users",
  },
  {
    id: "authentication",
    label: "Authentication",
    description: "Sign-in pathways (no auth execution)",
    icon: "KeyRound",
  },
  {
    id: "authorization",
    label: "Authorization",
    description: "Access decision topology (not enforced)",
    icon: "ShieldCheck",
  },
  {
    id: "mfa",
    label: "MFA",
    description: "Multi-factor coverage signals",
    icon: "Smartphone",
  },
  {
    id: "sessions",
    label: "Sessions",
    description: "Session observation models",
    icon: "Monitor",
  },
  {
    id: "permissions",
    label: "Permissions",
    description: "Permission and grant contracts",
    icon: "Lock",
  },
  {
    id: "break_glass",
    label: "Break Glass",
    description: "Emergency access readiness",
    icon: "Siren",
  },
  {
    id: "audit",
    label: "Audit",
    description: "Audit trail awareness",
    icon: "FileSearch",
  },
  {
    id: "compliance",
    label: "Compliance",
    description: "Control and finding posture",
    icon: "ClipboardCheck",
  },
  {
    id: "threat_detection",
    label: "Threat Detection",
    description: "Threat and detection signals",
    icon: "Radar",
  },
  {
    id: "platform",
    label: "Platform",
    description: "Control-plane and platform security",
    icon: "Server",
  },
  {
    id: "other",
    label: "Other",
    description: "Uncategorized security signals",
    icon: "Shield",
  },
] as const;

export function listSecurityFrameworkCategories(): readonly SecurityCategory[] {
  return SECURITY_FRAMEWORK_CATEGORIES;
}

export function getSecurityFrameworkCategory(
  id: SecurityCategory["id"],
): SecurityCategory | undefined {
  return SECURITY_FRAMEWORK_CATEGORIES.find((c) => c.id === id);
}
