import type { ReferenceMasterDomain, RegistryStatus } from "@prisma/client";
import { REFERENCE_MASTER_DOMAINS } from "@/constants/enterprise-master-data";
import type {
  CreateReferenceMasterInput,
  ReferenceMasterDomainSummary,
  ReferenceMasterQuery,
  UpdateReferenceMasterInput,
} from "@/types/enterprise-master-data";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { referenceMasterRepository } from "@server/repositories/reference-master/reference-master.repository";
import { enterpriseRegistryAuditService } from "@server/services/enterprise-registry/audit.service";

const DOMAIN_LABELS: Record<ReferenceMasterDomain, string> = {
  country: "Country",
  state: "State",
  city: "City",
  industry: "Industry",
  nature_of_business: "Nature of Business",
  constitution: "Constitution Type",
  employment_type: "Employment Type",
  occupation: "Occupation",
  loan_purpose: "Purpose of Loan",
  property_type: "Property Type",
  occupancy: "Occupancy",
  department: "Department",
  designation: "Designation",
  channel_type: "Channel Type",
  partner_category: "Partner Category",
  resident_status: "Resident Status",
  risk_appetite: "Risk Appetite",
  investment_horizon: "Investment Horizon",
  specialization: "Specialization",
};

function auditSnapshot(record: {
  id: string;
  domain: ReferenceMasterDomain;
  code: string;
  label: string;
  status: RegistryStatus;
  enabled: boolean;
  parentId?: string | null;
}) {
  return {
    id: record.id,
    domain: record.domain,
    code: record.code,
    label: record.label,
    status: record.status,
    enabled: record.enabled,
    parentId: record.parentId ?? null,
  };
}

export class ReferenceMasterService {
  async query(query: ReferenceMasterQuery) {
    const organizationId = await resolvePilotOrganizationId();
    return referenceMasterRepository.query(organizationId, query);
  }

  async getById(id: string) {
    return referenceMasterRepository.findById(id);
  }

  async listDomains(): Promise<ReferenceMasterDomainSummary[]> {
    const organizationId = await resolvePilotOrganizationId();
    const grouped = await referenceMasterRepository.countByDomain(organizationId);

    const totals = new Map<ReferenceMasterDomain, { active: number; total: number }>();
    for (const domain of REFERENCE_MASTER_DOMAINS) {
      totals.set(domain, { active: 0, total: 0 });
    }

    for (const row of grouped) {
      const entry = totals.get(row.domain) ?? { active: 0, total: 0 };
      entry.total += row._count._all;
      if (!row.isDeleted && row.status === "active") {
        entry.active += row._count._all;
      }
      totals.set(row.domain, entry);
    }

    return REFERENCE_MASTER_DOMAINS.map((domain) => ({
      domain,
      label: DOMAIN_LABELS[domain],
      activeCount: totals.get(domain)?.active ?? 0,
      totalCount: totals.get(domain)?.total ?? 0,
    }));
  }

  async create(input: CreateReferenceMasterInput, actorName?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const code = input.code.trim();
    const label = input.label.trim();
    if (!label) throw new Error("Label is required.");

    const duplicate = await referenceMasterRepository.findByCode(
      organizationId,
      input.domain,
      code,
    );
    if (duplicate) {
      throw new Error(`Reference master "${code}" already exists for domain ${input.domain}.`);
    }

    if (input.parentId) {
      const parent = await referenceMasterRepository.findById(input.parentId);
      if (!parent || parent.organizationId !== organizationId) {
        throw new Error("Parent reference master not found.");
      }
    }

    const created = await referenceMasterRepository.create(organizationId, input);

    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "reference_master",
      entityId: created.id,
      entityCode: created.code,
      action: "created",
      newValue: auditSnapshot(created),
      actorUserId: input.createdBy,
      actorName,
    });

    return created;
  }

  async update(id: string, input: UpdateReferenceMasterInput, actorName?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const existing = await referenceMasterRepository.findById(id);
    if (!existing) throw new Error("Reference master not found.");

    if (input.parentId) {
      if (input.parentId === id) throw new Error("A reference master cannot be its own parent.");
      const parent = await referenceMasterRepository.findById(input.parentId);
      if (!parent || parent.organizationId !== organizationId) {
        throw new Error("Parent reference master not found.");
      }
    }

    const updated = await referenceMasterRepository.update(id, input);

    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "reference_master",
      entityId: updated.id,
      entityCode: updated.code,
      action: "updated",
      previousValue: auditSnapshot(existing),
      newValue: auditSnapshot(updated),
      actorUserId: input.modifiedBy,
      actorName,
    });

    return updated;
  }

  async activate(id: string, actorId: string, actorName?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const existing = await referenceMasterRepository.findById(id);
    if (!existing) throw new Error("Reference master not found.");

    const updated = await referenceMasterRepository.setStatus(id, "active", actorId, true);

    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "reference_master",
      entityId: updated.id,
      entityCode: updated.code,
      action: "activated",
      previousValue: auditSnapshot(existing),
      newValue: auditSnapshot(updated),
      actorUserId: actorId,
      actorName,
    });

    return updated;
  }

  async deactivate(id: string, actorId: string, actorName?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const existing = await referenceMasterRepository.findById(id);
    if (!existing) throw new Error("Reference master not found.");

    const updated = await referenceMasterRepository.setStatus(id, "inactive", actorId, false);

    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "reference_master",
      entityId: updated.id,
      entityCode: updated.code,
      action: "deactivated",
      previousValue: auditSnapshot(existing),
      newValue: auditSnapshot(updated),
      actorUserId: actorId,
      actorName,
    });

    return updated;
  }

  async softDelete(id: string, actorId: string, reason?: string, actorName?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const existing = await referenceMasterRepository.findById(id);
    if (!existing) throw new Error("Reference master not found.");

    const updated = await referenceMasterRepository.softDelete(id, actorId, reason);

    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "reference_master",
      entityId: updated.id,
      entityCode: updated.code,
      action: "soft_deleted",
      previousValue: auditSnapshot(existing),
      newValue: auditSnapshot(updated),
      actorUserId: actorId,
      actorName,
      reason,
    });

    return updated;
  }
}

export const referenceMasterService = new ReferenceMasterService();
