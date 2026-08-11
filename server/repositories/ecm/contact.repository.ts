import { prisma } from "@server/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { EcmContactQuery } from "@/types/enterprise-contact-master";
import { normalizeEcmMobile } from "@/lib/enterprise-contact-master";
import {
  mapPrismaContactToDomain,
  type ContactCreateData,
  type ContactUpdateData,
} from "./mappers";

/**
 * Lookup variants for the same enterprise mobile identity.
 * Reuses `normalizeEcmMobile` (digits only) — does not invent a second normalizer.
 * Covers +91 / 91 / 0 / 10-digit presentation of the same number.
 */
export function ecmMobileLookupCandidates(mobilePrimary: string): string[] {
  const raw = mobilePrimary.trim();
  const digits = normalizeEcmMobile(raw);
  const out = new Set<string>();
  if (raw) out.add(raw);
  if (digits) out.add(digits);
  if (digits.length >= 10) {
    const last10 = digits.slice(-10);
    out.add(last10);
    out.add(`91${last10}`);
    out.add(`+91${last10}`);
    out.add(`0${last10}`);
  }
  return [...out];
}

/** Persist form aligned with ECM register (digit strip via normalizeEcmMobile). */
export function ecmCanonicalMobilePrimary(mobilePrimary: string): string {
  return normalizeEcmMobile(mobilePrimary) || mobilePrimary.trim();
}

export class EcmContactRepository {
  async findById(id: string, opts?: { includeDeleted?: boolean }) {
    const row = await prisma.ecmContact.findUnique({ where: { id } });
    if (!row) return null;
    if (row.isDeleted && !opts?.includeDeleted) return null;
    return mapPrismaContactToDomain(row);
  }

  async findByMobile(organizationId: string, mobilePrimary: string) {
    const candidates = ecmMobileLookupCandidates(mobilePrimary);
    const row = await prisma.ecmContact.findFirst({
      where: {
        organizationId,
        isDeleted: false,
        mobilePrimary: { in: candidates },
      },
      orderBy: { updatedAt: "desc" },
    });
    return row ? mapPrismaContactToDomain(row) : null;
  }

  /**
   * CO-CONTACT-IDENTITY-001 — Resolve any Contact for mobile (including soft-deleted).
   * Does not change uniqueness; used for restore / open-existing UX only.
   * CO-WP-INT-003 — candidate variants so +91 / 91 / 10-digit resolve to one identity.
   */
  async findIdentityByMobile(organizationId: string, mobilePrimary: string) {
    const candidates = ecmMobileLookupCandidates(mobilePrimary);
    const row = await prisma.ecmContact.findFirst({
      where: {
        organizationId,
        mobilePrimary: { in: candidates },
      },
      orderBy: [{ isDeleted: "asc" }, { updatedAt: "desc" }],
    });
    return row ? mapPrismaContactToDomain(row) : null;
  }

  /** Exact official-email match (case-insensitive). Prefer over fuzzy search for dedupe. */
  async findByOfficialEmail(organizationId: string, officialEmail: string) {
    const email = officialEmail.trim();
    if (!email) return null;
    const row = await prisma.ecmContact.findFirst({
      where: {
        organizationId,
        isDeleted: false,
        officialEmail: { equals: email, mode: "insensitive" },
      },
    });
    return row ? mapPrismaContactToDomain(row) : null;
  }

  async query(organizationId: string, query: EcmContactQuery = {}) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? 100, 1), 500);
    const search = query.search?.trim();
    const status = query.status ?? "all";
    const institutionKeys = (query.institutionKeys ?? [])
      .map((k) => k.trim())
      .filter(Boolean);

    // Institution-scoped Banker lookup uses JSON path SQL (role_profiles) —
    // Prisma JsonFilter equals is case-sensitive and cannot OR across aliases cleanly.
    if (institutionKeys.length > 0) {
      return this.queryByInstitutionKeys(organizationId, {
        ...query,
        page,
        pageSize,
        search,
        status,
        institutionKeys,
      });
    }

    const where: NonNullable<Parameters<typeof prisma.ecmContact.findMany>[0]>["where"] = {
      organizationId,
      // CO-SPRINT-119 — operational queries never surface soft-deleted records.
      isDeleted: false,
    };

    if (status === "active") {
      where.status = { not: "archived" };
      where.enabled = true;
    } else if (status !== "all") {
      where.status = status;
    }

    if (query.roles?.length) {
      where.roles = { hasSome: query.roles };
    }

    // CO-SPRINT-119 — New Arrivals / registry date filters (creation date SSOT)
    if (query.createdFrom || query.createdTo) {
      const createdAt: { gte?: Date; lte?: Date } = {};
      if (query.createdFrom) {
        const [y, m, d] = query.createdFrom.split("-").map(Number);
        createdAt.gte = new Date(y!, m! - 1, d!, 0, 0, 0, 0);
      }
      if (query.createdTo) {
        const [y, m, d] = query.createdTo.split("-").map(Number);
        createdAt.lte = new Date(y!, m! - 1, d!, 23, 59, 59, 999);
      }
      where.createdAt = createdAt;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { mobilePrimary: { contains: search } },
        { mobileSecondary: { contains: search } },
        { personalEmail: { contains: search, mode: "insensitive" } },
        { officialEmail: { contains: search, mode: "insensitive" } },
        { ownerName: { contains: search, mode: "insensitive" } },
      ];
    }

    const sortBy = query.sortBy ?? "createdOn";
    const sortDir = query.sortDir ?? "desc";
    const orderByField =
      sortBy === "modifiedOn"
        ? "updatedAt"
        : sortBy === "createdOn"
          ? "createdAt"
          : sortBy === "lastActiveOn"
            ? "lastActiveAt"
            : sortBy === "contactScore"
              ? "contactScore"
              : sortBy === "name"
                ? "name"
                : "updatedAt";

    const skip = (page - 1) * pageSize;
    const rows = await prisma.ecmContact.findMany({
      where,
      orderBy: { [orderByField]: sortDir },
      skip,
      take: pageSize,
    });

    let total: number;
    if (query.skipTotal) {
      total = skip + rows.length + (rows.length === pageSize ? 1 : 0);
    } else {
      total = await prisma.ecmContact.count({ where });
    }

    return {
      items: rows.map(mapPrismaContactToDomain),
      total,
      page,
      pageSize,
    };
  }

  /**
   * CO-BUG-LSC-LOOKUP — Fast institution-scoped Contact query.
   * Filters role_profiles.lender_employee.{institution,institutionLabel,lenderName}
   * so LSC never paginates the full banker table client-side.
   */
  private async queryByInstitutionKeys(
    organizationId: string,
    query: EcmContactQuery & {
      page: number;
      pageSize: number;
      search?: string;
      status: NonNullable<EcmContactQuery["status"]>;
      institutionKeys: string[];
    },
  ) {
    const keyVariants = [
      ...new Set(
        query.institutionKeys.flatMap((k) => {
          const raw = k.trim();
          if (!raw) return [];
          return [raw, raw.toLowerCase()];
        }),
      ),
    ];

    const institutionOr: Prisma.EcmContactWhereInput[] = keyVariants.flatMap((key) => {
      const clauses: Prisma.EcmContactWhereInput[] = [
        { roleProfiles: { path: ["lender_employee", "institution"], equals: key } },
        { roleProfiles: { path: ["lender_employee", "institutionLabel"], equals: key } },
        { roleProfiles: { path: ["lender_employee", "lenderName"], equals: key } },
      ];
      if (key.length >= 3) {
        clauses.push(
          {
            roleProfiles: {
              path: ["lender_employee", "institutionLabel"],
              string_contains: key,
            },
          },
          {
            roleProfiles: {
              path: ["lender_employee", "lenderName"],
              string_contains: key,
            },
          },
        );
      }
      return clauses;
    });

    const andClauses: Prisma.EcmContactWhereInput[] = [{ OR: institutionOr }];

    const where: Prisma.EcmContactWhereInput = {
      organizationId,
      isDeleted: false,
      roles: { hasSome: query.roles?.length ? query.roles : ["lender_employee"] },
      AND: andClauses,
    };

    if (query.status === "active") {
      where.status = { not: "archived" };
      where.enabled = true;
    } else if (query.status !== "all") {
      where.status = query.status;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      andClauses.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { mobilePrimary: { contains: search } },
          { mobileSecondary: { contains: search } },
          { personalEmail: { contains: search, mode: "insensitive" } },
          { officialEmail: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    const sortBy = query.sortBy ?? "name";
    const sortDir = query.sortDir ?? "asc";
    const orderByField =
      sortBy === "modifiedOn"
        ? "updatedAt"
        : sortBy === "createdOn"
          ? "createdAt"
          : sortBy === "lastActiveOn"
            ? "lastActiveAt"
            : sortBy === "contactScore"
              ? "contactScore"
              : sortBy === "name"
                ? "name"
                : "updatedAt";

    const skip = (query.page - 1) * query.pageSize;
    const rows = await prisma.ecmContact.findMany({
      where,
      orderBy: { [orderByField]: sortDir },
      skip,
      take: query.pageSize,
    });

    let total: number;
    if (query.skipTotal) {
      total = skip + rows.length + (rows.length === query.pageSize ? 1 : 0);
    } else {
      total = await prisma.ecmContact.count({ where });
    }

    return {
      items: rows.map(mapPrismaContactToDomain),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async create(data: ContactCreateData) {
    const row = await prisma.ecmContact.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        mobilePrimary: data.mobilePrimary,
        mobileSecondary: data.mobileSecondary,
        personalEmail: data.personalEmail,
        officialEmail: data.officialEmail,
        city: data.city,
        state: data.state,
        country: data.country,
        address: data.address,
        pan: data.pan,
        aadhaar: data.aadhaar,
        dateOfBirth: data.dateOfBirth,
        employmentType: data.employmentType,
        primaryRole: data.primaryRole,
        roles: data.roles,
        additionalRoles: data.additionalRoles,
        roleProfiles: data.roleProfiles ?? undefined,
        status: data.status,
        platformAccess: data.platformAccess ?? "no_access",
        ownerName: data.ownerName,
        ownerId: data.ownerId,
        contactScore: data.contactScore ?? 0,
        strategicContact: data.strategicContact ?? false,
        createdBy: data.createdBy,
        modifiedBy: data.modifiedBy,
      },
    });
    return mapPrismaContactToDomain(row);
  }

  async update(id: string, data: ContactUpdateData) {
    const row = await prisma.ecmContact.update({
      where: { id },
      data: {
        name: data.name,
        mobilePrimary: data.mobilePrimary,
        mobileSecondary: data.mobileSecondary,
        personalEmail: data.personalEmail,
        officialEmail: data.officialEmail,
        city: data.city,
        state: data.state,
        country: data.country,
        address: data.address,
        pan: data.pan,
        aadhaar: data.aadhaar,
        dateOfBirth: data.dateOfBirth,
        employmentType: data.employmentType,
        primaryRole: data.primaryRole,
        roles: data.roles,
        additionalRoles: data.additionalRoles,
        roleProfiles: data.roleProfiles ?? undefined,
        status: data.status,
        platformAccess: data.platformAccess,
        linkedUserId: data.linkedUserId,
        ownerName: data.ownerName,
        ownerId: data.ownerId,
        contactScore: data.contactScore,
        strategicContact: data.strategicContact,
        enabled: data.enabled,
        archivedBy: data.archivedBy,
        archivedAt: data.archivedAt,
        isDeleted: data.isDeleted,
        deletedAt: data.deletedAt,
        deletedBy: data.deletedBy,
        deletionReason: data.deletionReason,
        lastActiveAt: data.lastActiveAt,
        modifiedBy: data.modifiedBy,
      },
    });
    return mapPrismaContactToDomain(row);
  }
}

export const ecmContactRepository = new EcmContactRepository();
