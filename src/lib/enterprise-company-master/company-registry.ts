import type {
  EcmCompany,
  EcmCompanyContactLink,
  EcmCompanyQuery,
  EcmCompanyQueryResult,
  EcmCompanyReadiness,
  EcmCompanyRegisterInput,
  EcmCompanyRelationRole,
} from "@/types/enterprise-company-master";

const companies = new Map<string, EcmCompany>();
const links = new Map<string, EcmCompanyContactLink>();

function nowIso() {
  return new Date().toISOString();
}

function computeCompanyScore(company: EcmCompany, linkCount: number): number {
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

export function listEcmCompanies(): EcmCompany[] {
  return [...companies.values()].filter((c) => c.enabled);
}

export function getEcmCompany(id: string): EcmCompany | undefined {
  return companies.get(id);
}

export function findEcmCompanyByName(name: string): EcmCompany | undefined {
  const key = name.trim().toLowerCase();
  if (!key) return undefined;
  return listEcmCompanies().find((c) => c.companyName.trim().toLowerCase() === key);
}

export function registerEcmCompany(input: EcmCompanyRegisterInput): EcmCompany {
  const name = input.companyName.trim();
  if (!name) throw new Error("Company Name is required.");

  const existing = findEcmCompanyByName(name);
  if (existing) return existing;

  const createdOn = nowIso();
  const draft: EcmCompany = {
    id: crypto.randomUUID(),
    companyName: name,
    constitution: input.constitution?.trim() || undefined,
    cin: input.cin?.trim() || undefined,
    pan: input.pan?.trim() || undefined,
    gst: input.gst?.trim() || undefined,
    dateOfIncorporation: input.dateOfIncorporation?.trim() || undefined,
    registeredAddress: input.registeredAddress?.trim() || undefined,
    industry: input.industry?.trim() || undefined,
    natureOfBusiness: input.natureOfBusiness?.trim() || undefined,
    yearsInBusiness: input.yearsInBusiness?.trim() || undefined,
    annualTurnover: input.annualTurnover?.trim() || undefined,
    approximateNetProfit: input.approximateNetProfit?.trim() || undefined,
    employeeStrength: input.employeeStrength?.trim() || undefined,
    website: input.website?.trim() || undefined,
    status: input.status ?? "active",
    enabled: true,
    ownerName: input.ownerName,
    ownerId: input.ownerId,
    companyScore: 0,
    createdBy: input.createdBy,
    createdOn,
    modifiedBy: input.createdBy,
    modifiedOn: createdOn,
  };
  draft.companyScore = computeCompanyScore(draft, 0);
  companies.set(draft.id, draft);
  return draft;
}

export function updateEcmCompany(
  id: string,
  patch: Partial<EcmCompanyRegisterInput>,
  actorId: string,
): EcmCompany {
  const current = companies.get(id);
  if (!current || !current.enabled) throw new Error("Company not found.");

  const next: EcmCompany = {
    ...current,
    companyName: patch.companyName?.trim() || current.companyName,
    constitution: patch.constitution !== undefined ? patch.constitution.trim() || undefined : current.constitution,
    cin: patch.cin !== undefined ? patch.cin.trim() || undefined : current.cin,
    pan: patch.pan !== undefined ? patch.pan.trim() || undefined : current.pan,
    gst: patch.gst !== undefined ? patch.gst.trim() || undefined : current.gst,
    dateOfIncorporation:
      patch.dateOfIncorporation !== undefined
        ? patch.dateOfIncorporation.trim() || undefined
        : current.dateOfIncorporation,
    registeredAddress:
      patch.registeredAddress !== undefined
        ? patch.registeredAddress.trim() || undefined
        : current.registeredAddress,
    industry: patch.industry !== undefined ? patch.industry.trim() || undefined : current.industry,
    natureOfBusiness:
      patch.natureOfBusiness !== undefined
        ? patch.natureOfBusiness.trim() || undefined
        : current.natureOfBusiness,
    yearsInBusiness:
      patch.yearsInBusiness !== undefined
        ? patch.yearsInBusiness.trim() || undefined
        : current.yearsInBusiness,
    annualTurnover:
      patch.annualTurnover !== undefined
        ? patch.annualTurnover.trim() || undefined
        : current.annualTurnover,
    approximateNetProfit:
      patch.approximateNetProfit !== undefined
        ? patch.approximateNetProfit.trim() || undefined
        : current.approximateNetProfit,
    employeeStrength:
      patch.employeeStrength !== undefined
        ? patch.employeeStrength.trim() || undefined
        : current.employeeStrength,
    website: patch.website !== undefined ? patch.website.trim() || undefined : current.website,
    modifiedBy: actorId,
    modifiedOn: nowIso(),
  };
  next.companyScore = computeCompanyScore(next, listCompanyLinks(id).length);
  companies.set(id, next);
  return next;
}

export function archiveEcmCompany(id: string, actorId: string): void {
  const current = companies.get(id);
  if (!current) return;
  companies.set(id, {
    ...current,
    status: "archived",
    enabled: false,
    modifiedBy: actorId,
    modifiedOn: nowIso(),
  });
}

export function queryEcmCompanies(query: EcmCompanyQuery = {}): EcmCompanyQueryResult {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 100;
  const search = query.search?.trim().toLowerCase() ?? "";
  let items = listEcmCompanies();

  if (query.status && query.status !== "all") {
    items = items.filter((c) => c.status === query.status);
  }
  if (search) {
    items = items.filter((c) => {
      const hay = [
        c.companyName,
        c.pan,
        c.gst,
        c.cin,
        c.industry,
        c.natureOfBusiness,
        c.ownerName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(search);
    });
  }

  items.sort((a, b) => b.modifiedOn.localeCompare(a.modifiedOn));
  const total = items.length;
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
  };
}

export function listCompanyLinks(companyId: string): EcmCompanyContactLink[] {
  return [...links.values()].filter((l) => l.companyId === companyId && l.status === "active");
}

export function listContactCompanyLinks(contactId: string): EcmCompanyContactLink[] {
  return [...links.values()].filter((l) => l.contactId === contactId && l.status === "active");
}

export function linkCompanyContact(input: {
  companyId: string;
  contactId: string;
  relationRole: EcmCompanyRelationRole;
  createdBy: string;
}): EcmCompanyContactLink {
  const existing = [...links.values()].find(
    (l) =>
      l.companyId === input.companyId &&
      l.contactId === input.contactId &&
      l.relationRole === input.relationRole &&
      l.status === "active",
  );
  if (existing) return existing;

  const createdOn = nowIso();
  const link: EcmCompanyContactLink = {
    id: crypto.randomUUID(),
    companyId: input.companyId,
    contactId: input.contactId,
    relationRole: input.relationRole,
    status: "active",
    createdBy: input.createdBy,
    createdOn,
    modifiedBy: input.createdBy,
    modifiedOn: createdOn,
  };
  links.set(link.id, link);

  const company = companies.get(input.companyId);
  if (company) {
    company.companyScore = computeCompanyScore(company, listCompanyLinks(input.companyId).length);
    company.modifiedOn = createdOn;
    companies.set(company.id, company);
  }
  return link;
}

export function unlinkCompanyContact(linkId: string, actorId: string): void {
  const link = links.get(linkId);
  if (!link) return;
  links.set(linkId, {
    ...link,
    status: "inactive",
    modifiedBy: actorId,
    modifiedOn: nowIso(),
  });
}

export function deriveEcmCompanyReadiness(company: EcmCompany): EcmCompanyReadiness {
  const identityFields = [
    company.companyName,
    company.constitution,
    company.cin || company.pan || company.gst,
    company.dateOfIncorporation,
    company.registeredAddress,
  ];
  const identityFilled = identityFields.filter(Boolean).length;
  const identityPct = Math.round((identityFilled / identityFields.length) * 100);

  const businessFields = [
    company.industry,
    company.natureOfBusiness,
    company.yearsInBusiness,
    company.annualTurnover,
  ];
  const businessFilled = businessFields.filter(Boolean).length;
  const businessPct = Math.round((businessFilled / businessFields.length) * 100);

  const linkCount = listCompanyLinks(company.id).length;
  const relationshipPct = linkCount > 0 ? 100 : 0;
  const overallPct = Math.round((identityPct + businessPct + relationshipPct) / 3);

  return {
    identityPct,
    businessPct,
    relationshipPct,
    overallPct,
    identityComplete: identityPct >= 80,
    businessComplete: businessPct >= 75,
    relationshipsPresent: linkCount > 0,
  };
}

export function seedEcmCompaniesIfEmpty(): void {
  if (companies.size > 0) return;
  const peak = registerEcmCompany({
    companyName: "Peakprofits Capital Services Pvt Ltd",
    constitution: "private_limited",
    industry: "bfsi",
    natureOfBusiness: "services",
    yearsInBusiness: "8",
    annualTurnover: "12 Cr",
    pan: "AABCP1234F",
    gst: "27AABCP1234F1Z5",
    registeredAddress: "Bandra Kurla Complex, Mumbai",
    ownerName: "Platform Admin",
    createdBy: "system",
  });
  registerEcmCompany({
    companyName: "Acme Homes Pvt Ltd",
    constitution: "private_limited",
    industry: "real-estate",
    natureOfBusiness: "real-estate-dev",
    yearsInBusiness: "12",
    annualTurnover: "85 Cr",
    ownerName: "Platform Admin",
    createdBy: "system",
  });
  void peak;
}

export function resetEcmCompanyRegistry(): void {
  companies.clear();
  links.clear();
}
