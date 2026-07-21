export {
  CATALYST_ONE_SUPABASE_PROJECT_ID,
  CATALYST_ONE_SUPABASE_URL,
  CO_SPRINT_117_CERTIFICATION_GATES,
  ENTERPRISE_PERSISTENCE_MODE_ENV,
  ENTERPRISE_PERSISTENCE_ORG_SLUG,
  FORBIDDEN_CATALYST_ONE_SUPABASE_PROJECT_IDS,
  isEnterprisePersistencePrisma,
  resolveEnterprisePersistenceMode,
  type CoSprint117CertificationGate,
  type EnterprisePersistenceMode,
} from "@/constants/enterprise-persistence";

export {
  configureEcmPersistencePorts,
  configureEcmPersistencePorts as configureEcmPortsForPrisma,
  isEcmPrismaPersistenceActive,
  syncEcmPortsFromPrisma,
} from "./configure-ports";

export { ecmApiClient } from "./ecm-api-client";

export {
  hydrateEcmFromPrisma,
  persistLinkCompanyContact,
  persistRegisterEcmCompany,
  persistRegisterEcmContact,
  persistUpdateEcmCompany,
  persistUpdateEcmContact,
} from "./ecm-persist";
