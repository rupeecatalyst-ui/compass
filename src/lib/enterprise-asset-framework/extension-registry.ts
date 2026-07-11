/**
 * EAF domain extension registry — modules register without modifying EAF core.
 */

import type { EafDomainExtensionRegistration } from "@/types/enterprise-asset-framework-extension";

let extensionsOverride: EafDomainExtensionRegistration[] | null = null;

export function resetEafExtensionRegistry(): void {
  extensionsOverride = null;
}

export function listEafDomainExtensions(): EafDomainExtensionRegistration[] {
  return extensionsOverride ?? [];
}

export function registerEafDomainExtension(registration: EafDomainExtensionRegistration): void {
  if (!registration.enabled) return;

  const existing = listEafDomainExtensions();
  extensionsOverride = [
    ...existing.filter((e) => e.extensionId !== registration.extensionId),
    registration,
  ];
}

export function findEafDomainExtension(extensionId: string): EafDomainExtensionRegistration | undefined {
  return listEafDomainExtensions().find((e) => e.extensionId === extensionId && e.enabled);
}
