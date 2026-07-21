import type {
  EcmCompanyQuery,
  EcmCompanyRegisterInput,
  EcmCompanyRelationRole,
} from "@/types/enterprise-company-master";
import {
  formatCompanyDisplayName,
  normalizeCompanyNameKey,
} from "@/lib/enterprise-company-master/name-normalize";
import { ecmCompanyRepository } from "@server/repositories/ecm/company.repository";
import { ecmContactRepository } from "@server/repositories/ecm/contact.repository";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";

function computeCompanyScore(
  company: {
    constitution?: string;
    cin?: string;
    pan?: string;
    gst?: string;
    registeredAddress?: string;
    industry?: string;
    natureOfBusiness?: string;
    annualTurnover?: string;
  },
  linkCount: number,
): number {
  let score = 20;
  if (company.constitution) score += 10;
  if (company.cin || company.pan || company.gst) score += 15;
  if (company.registeredAddress) score += 10;
  if (company.industry) score += 10;
  if (company.natureOfBusiness) score += 10;
  if (company.annualTurnover) score += 10;
  if (linkCount > 0) score += Math.min(15, linkCount * 5);
  return Math.min(100, score);
}

export class EcmCompanyService {
  async query(query: EcmCompanyQuery = {}) {
    const organizationId = await resolvePilotOrganizationId();
    return ecmCompanyRepository.query(organizationId, query);
  }

  async getById(id: string) {
    return ecmCompanyRepository.findById(id);
  }

  async register(input: EcmCompanyRegisterInput) {
    const organizationId = await resolvePilotOrganizationId();
    const displayName = formatCompanyDisplayName(input.companyName);
    if (!displayName) throw new Error("Company Name is required.");

    const nameKey = normalizeCompanyNameKey(displayName);
    const existing = await ecmCompanyRepository.findEnabledByNameKey(organizationId, nameKey);
    if (existing) return existing;

    const draft = {
      organizationId,
      companyName: displayName,
      constitution: input.constitution?.trim(),
      cin: input.cin?.trim(),
      pan: input.pan?.trim(),
      gst: input.gst?.trim(),
      dateOfIncorporation: input.dateOfIncorporation?.trim(),
      registeredAddress: input.registeredAddress?.trim(),
      industry: input.industry?.trim(),
      natureOfBusiness: input.natureOfBusiness?.trim(),
      yearsInBusiness: input.yearsInBusiness?.trim(),
      annualTurnover: input.annualTurnover?.trim(),
      approximateNetProfit: input.approximateNetProfit?.trim(),
      employeeStrength: input.employeeStrength?.trim(),
      website: input.website?.trim(),
      status: input.status ?? "active",
      ownerName: input.ownerName,
      ownerId: input.ownerId,
      companyScore: computeCompanyScore(input, 0),
      createdBy: input.createdBy,
      modifiedBy: input.createdBy,
    };

    return ecmCompanyRepository.create(draft);
  }

  async update(id: string, patch: Partial<EcmCompanyRegisterInput>, actorId: string) {
    const existing = await ecmCompanyRepository.findById(id);
    if (!existing || !existing.enabled) throw new Error("Company not found.");

    const organizationId = await resolvePilotOrganizationId();
    let companyName = existing.companyName;
    if (patch.companyName) {
      companyName = formatCompanyDisplayName(patch.companyName);
      const nameKey = normalizeCompanyNameKey(companyName);
      const dup = await ecmCompanyRepository.findEnabledByNameKey(organizationId, nameKey);
      if (dup && dup.id !== id) {
        throw new Error(`Company "${companyName}" already exists.`);
      }
    }

    const linkCount = await ecmCompanyRepository.countLinks(id);
    const merged = { ...existing, ...patch, companyName };
    return ecmCompanyRepository.update(id, {
      companyName,
      constitution: patch.constitution?.trim(),
      cin: patch.cin?.trim(),
      pan: patch.pan?.trim(),
      gst: patch.gst?.trim(),
      dateOfIncorporation: patch.dateOfIncorporation?.trim(),
      registeredAddress: patch.registeredAddress?.trim(),
      industry: patch.industry?.trim(),
      natureOfBusiness: patch.natureOfBusiness?.trim(),
      yearsInBusiness: patch.yearsInBusiness?.trim(),
      annualTurnover: patch.annualTurnover?.trim(),
      approximateNetProfit: patch.approximateNetProfit?.trim(),
      employeeStrength: patch.employeeStrength?.trim(),
      website: patch.website?.trim(),
      status: patch.status,
      ownerName: patch.ownerName ?? existing.ownerName,
      ownerId: patch.ownerId ?? existing.ownerId,
      companyScore: computeCompanyScore(merged, linkCount),
      modifiedBy: actorId,
    });
  }

  async archive(id: string, actorId: string) {
    const now = new Date();
    return ecmCompanyRepository.update(id, {
      status: "archived",
      enabled: false,
      archivedBy: actorId,
      archivedAt: now,
      isDeleted: true,
      deletedAt: now,
      deletedBy: actorId,
      modifiedBy: actorId,
    });
  }

  async listLinks(companyId: string) {
    return ecmCompanyRepository.listLinksByCompany(companyId);
  }

  async listAllLinks() {
    const organizationId = await resolvePilotOrganizationId();
    return ecmCompanyRepository.listLinksByOrganization(organizationId);
  }

  async linkContact(input: {
    companyId: string;
    contactId: string;
    relationRole: EcmCompanyRelationRole;
    createdBy: string;
  }) {
    const organizationId = await resolvePilotOrganizationId();
    const company = await ecmCompanyRepository.findById(input.companyId);
    if (!company || !company.enabled) throw new Error("Company not found.");
    const contact = await ecmContactRepository.findById(input.contactId);
    if (!contact || !contact.enabled) throw new Error("Contact not found.");

    const link = await ecmCompanyRepository.linkContact({
      organizationId,
      companyId: input.companyId,
      contactId: input.contactId,
      relationRole: input.relationRole,
      createdBy: input.createdBy,
    });

    const linkCount = await ecmCompanyRepository.countLinks(input.companyId);
    await ecmCompanyRepository.update(input.companyId, {
      companyScore: computeCompanyScore(company, linkCount),
      modifiedBy: input.createdBy,
    });

    return link;
  }
}

export const ecmCompanyService = new EcmCompanyService();

