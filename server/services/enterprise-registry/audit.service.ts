import type { AppendRegistryAuditInput, RegistryAuditQuery } from "@/types/enterprise-master-data";
import { enterpriseRegistryAuditRepository } from "@server/repositories/enterprise-registry/audit.repository";

/** Append-only audit trail for enterprise registry configuration changes. */
export class EnterpriseRegistryAuditService {
  async recordChange(input: AppendRegistryAuditInput) {
    return enterpriseRegistryAuditRepository.append(input);
  }

  async listAuditTrail(organizationId: string, query?: RegistryAuditQuery) {
    return enterpriseRegistryAuditRepository.query(organizationId, query);
  }
}

export const enterpriseRegistryAuditService = new EnterpriseRegistryAuditService();
