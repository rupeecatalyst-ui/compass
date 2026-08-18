import "server-only";

import { Prisma } from "@prisma/client";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { enterpriseAccountingGstRateRepository } from "@server/repositories/enterprise-accounting-gst-rate/enterprise-accounting-gst-rate.repository";
import type {
  CreateEnterpriseAccountingGstRateInput,
  UpdateEnterpriseAccountingGstRateInput,
} from "@/types/enterprise-accounting-gst-rate";

function decimalRate(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw Object.assign(new Error(`${field} must be a non-negative number`), {
      statusCode: 400,
      code: "INVALID_GST_RATE",
    });
  }
  return new Prisma.Decimal(value);
}

function optionalDate(value: string | null | undefined, field: string) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error(`${field} must be a valid date`), {
      statusCode: 400,
      code: "INVALID_GST_RATE_DATE",
    });
  }
  return parsed;
}

function serialize(row: {
  id: string;
  organizationId: string;
  name: string;
  ratePercent: Prisma.Decimal;
  enabled: boolean;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    ratePercent: row.ratePercent.toNumber(),
    enabled: row.enabled,
    effectiveFrom: row.effectiveFrom?.toISOString() ?? null,
    effectiveUntil: row.effectiveUntil?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class EnterpriseAccountingGstRateService {
  async list(query?: { enabled?: boolean; activeOnly?: boolean }) {
    const organizationId = await resolvePilotOrganizationId();
    const rows = await enterpriseAccountingGstRateRepository.list(organizationId, query);
    return rows.map(serialize);
  }

  async get(id: string) {
    const organizationId = await resolvePilotOrganizationId();
    const row = await enterpriseAccountingGstRateRepository.findById(organizationId, id);
    if (!row) {
      throw Object.assign(new Error("GST rate not found"), {
        statusCode: 404,
        code: "GST_RATE_NOT_FOUND",
      });
    }
    return serialize(row);
  }

  async create(input: CreateEnterpriseAccountingGstRateInput, actorUserId: string) {
    const name = input.name.trim();
    if (!name) {
      throw Object.assign(new Error("GST rate name is required"), {
        statusCode: 400,
        code: "INVALID_GST_RATE",
      });
    }
    const organizationId = await resolvePilotOrganizationId();
    const row = await enterpriseAccountingGstRateRepository.create({
      organization: { connect: { id: organizationId } },
      name,
      ratePercent: decimalRate(input.ratePercent, "ratePercent"),
      enabled: input.enabled === undefined ? true : Boolean(input.enabled),
      effectiveFrom: optionalDate(input.effectiveFrom, "effectiveFrom") ?? undefined,
      effectiveUntil: optionalDate(input.effectiveUntil, "effectiveUntil") ?? undefined,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    });
    return serialize(row);
  }

  async update(
    id: string,
    input: UpdateEnterpriseAccountingGstRateInput,
    actorUserId: string,
  ) {
    const organizationId = await resolvePilotOrganizationId();
    const data: Prisma.EnterpriseAccountingGstRateUpdateInput = {
      updatedBy: actorUserId,
    };
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) {
        throw Object.assign(new Error("GST rate name cannot be empty"), {
          statusCode: 400,
          code: "INVALID_GST_RATE",
        });
      }
      data.name = name;
    }
    if (input.ratePercent !== undefined) {
      data.ratePercent = decimalRate(input.ratePercent, "ratePercent");
    }
    if (input.enabled !== undefined) data.enabled = Boolean(input.enabled);
    if (input.effectiveFrom !== undefined) {
      data.effectiveFrom = optionalDate(input.effectiveFrom, "effectiveFrom");
    }
    if (input.effectiveUntil !== undefined) {
      data.effectiveUntil = optionalDate(input.effectiveUntil, "effectiveUntil");
    }
    const row = await enterpriseAccountingGstRateRepository.update(organizationId, id, data);
    return serialize(row);
  }
}

export const enterpriseAccountingGstRateService = new EnterpriseAccountingGstRateService();
