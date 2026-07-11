export {
  configureEiaePorts,
  getEiaePorts,
  resetEiaeComposition,
} from "./composition";

export { createInMemoryEiaePorts } from "./repositories/in-memory";

export {
  canTransitionEiaeIdentityLifecycle,
  createEiaeIdentity,
  deleteEiaeIdentity,
  getEiaeIdentityById,
  listEiaeIdentities,
  resetEiaeIdentityRegistry,
  transitionEiaeIdentityLifecycle,
  updateEiaeIdentity,
} from "./identity-registry";

export { getEiaeIdentityLifecycleMetadata } from "./identity-governance";

export {
  getEiaePersona,
  listEiaePersonas,
  registerEiaePersona,
} from "./persona-registry";

export {
  getEiaeAuthProvider,
  listEiaeAuthPolicies,
  listEiaeAuthProviders,
  registerEiaeAuthPolicy,
  registerEiaeAuthProvider,
  resolveEiaeAuthProviders,
} from "./authentication-policy";

export {
  getEiaeRole,
  listEiaePermissionGroups,
  listEiaePermissionTemplates,
  listEiaePermissions,
  listEiaeRoles,
  registerEiaePermission,
  registerEiaePermissionGroup,
  registerEiaePermissionTemplate,
  registerEiaeRole,
  resolveEiaePermissionsForPersona,
} from "./authorization-foundation";

export {
  getEiaeOrganizationalHierarchy,
  getEiaeOrganizationalScope,
  listEiaeOrganizationalScopes,
  registerEiaeOrganizationalScope,
} from "./organizational-access";

export {
  appendEiaeLoginHistory,
  listEiaeDeviceMetadata,
  listEiaeLoginHistory,
  listEiaeMfaPlaceholders,
  listEiaeSessionMetadata,
  registerEiaeDeviceMetadata,
  registerEiaeSessionMetadata,
} from "./session-foundation";

export {
  canEiaePersonaPermanentlyPurge,
  getEiaeDeletionGovernancePermission,
  isEiaePersonaAuthorizedForDeletionAction,
  listEiaeDeletionGovernancePermissions,
} from "./deletion-governance";

export {
  getEiaeFrameworkVersion,
  getEiaeRegistrySnapshot,
} from "./registry-snapshot";
