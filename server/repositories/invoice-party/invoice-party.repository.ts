/**
 * CO-ARCH-003 Phase 2B Sprint 1 — Accounting Invoice Party Master repository.
 * Table: enterprise_accounting_payees (backward-compatible physical name).
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@server/lib/prisma";

export type CreateInvoicePartyInput = {
  organizationId: string;
  partyType: string;
  legalName: string;
  billingName: string;
  displayName: string;
  contactId?: string | null;
  companyId?: string | null;
  gstin?: string | null;
  pan?: string | null;
  billingAddress?: string | null;
  stateLabel?: string | null;
  invoiceEmail?: string | null;
  tdsApplicable?: boolean;
  tdsRatePercent?: number | null;
  gstStatus?: string | null;
  specify?: string | null;
  notes?: string | null;
  enabled?: boolean;
  actorUserId?: string | null;
};

export type UpdateInvoicePartyInput = Partial<
  Omit<CreateInvoicePartyInput, "organizationId" | "actorUserId">
> & {
  actorUserId?: string | null;
};

const includeParty = {
  contact: { select: { id: true, name: true, mobilePrimary: true } },
  company: { select: { id: true, companyName: true } },
} as const;

export class InvoicePartyRepository {
  async findById(organizationId: string, id: string) {
    return prisma.enterpriseInvoiceParty.findFirst({
      where: { id, organizationId, isDeleted: false },
      include: includeParty,
    });
  }

  async listActive(organizationId: string) {
    return prisma.enterpriseInvoiceParty.findMany({
      where: { organizationId, isDeleted: false, enabled: true },
      orderBy: { displayName: "asc" },
      include: {
        contact: { select: { id: true, name: true } },
        company: { select: { id: true, companyName: true } },
      },
    });
  }

  async listAll(organizationId: string, opts?: { q?: string; enabled?: boolean }) {
    const where: Prisma.EnterpriseInvoicePartyWhereInput = {
      organizationId,
      isDeleted: false,
      ...(opts?.enabled !== undefined ? { enabled: opts.enabled } : {}),
      ...(opts?.q
        ? {
            OR: [
              { displayName: { contains: opts.q, mode: "insensitive" } },
              { legalName: { contains: opts.q, mode: "insensitive" } },
              { billingName: { contains: opts.q, mode: "insensitive" } },
              { gstin: { contains: opts.q, mode: "insensitive" } },
              { pan: { contains: opts.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    return prisma.enterpriseInvoiceParty.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: includeParty,
    });
  }

  async create(input: CreateInvoicePartyInput) {
    if (!input.contactId && !input.companyId) {
      throw new Error("Invoice Party must reference exactly one Contact or Company");
    }
    if (input.contactId) {
      const contact = await prisma.ecmContact.findFirst({
        where: { id: input.contactId, organizationId: input.organizationId, isDeleted: false },
      });
      if (!contact) throw new Error("contactId must reference a valid Contact");
      const existing = await prisma.enterpriseInvoiceParty.findFirst({
        where: {
          organizationId: input.organizationId,
          contactId: input.contactId,
          isDeleted: false,
        },
      });
      if (existing) {
        throw Object.assign(
          new Error("This Contact already has an Invoice Party Master record"),
          { status: 409, code: "INVOICE_PARTY_CONTACT_EXISTS" },
        );
      }
    }
    if (input.companyId) {
      const company = await prisma.ecmCompany.findFirst({
        where: { id: input.companyId, organizationId: input.organizationId, isDeleted: false },
      });
      if (!company) throw new Error("companyId must reference a valid Company");
      const existing = await prisma.enterpriseInvoiceParty.findFirst({
        where: {
          organizationId: input.organizationId,
          companyId: input.companyId,
          isDeleted: false,
        },
      });
      if (existing) {
        throw Object.assign(
          new Error("This Company already has an Invoice Party Master record"),
          { status: 409, code: "INVOICE_PARTY_COMPANY_EXISTS" },
        );
      }
    }

    return prisma.enterpriseInvoiceParty.create({
      data: {
        organizationId: input.organizationId,
        partyType: input.partyType,
        legalName: input.legalName,
        billingName: input.billingName,
        displayName: input.displayName,
        contactId: input.contactId ?? null,
        companyId: input.companyId ?? null,
        gstin: input.gstin ?? null,
        pan: input.pan ?? null,
        billingAddress: input.billingAddress ?? null,
        stateLabel: input.stateLabel ?? null,
        invoiceEmail: input.invoiceEmail ?? null,
        tdsApplicable: input.tdsApplicable ?? false,
        tdsRatePercent: input.tdsRatePercent ?? null,
        gstStatus: input.gstStatus ?? null,
        specify: input.specify ?? null,
        notes: input.notes ?? null,
        enabled: input.enabled ?? true,
        createdBy: input.actorUserId ?? null,
        updatedBy: input.actorUserId ?? null,
      },
      include: includeParty,
    });
  }

  async update(organizationId: string, id: string, input: UpdateInvoicePartyInput) {
    const existing = await this.findById(organizationId, id);
    if (!existing) throw new Error("Invoice Party not found");

    return prisma.enterpriseInvoiceParty.update({
      where: { id },
      data: {
        ...(input.partyType !== undefined ? { partyType: input.partyType } : {}),
        ...(input.legalName !== undefined ? { legalName: input.legalName } : {}),
        ...(input.billingName !== undefined ? { billingName: input.billingName } : {}),
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(input.contactId !== undefined ? { contactId: input.contactId } : {}),
        ...(input.companyId !== undefined ? { companyId: input.companyId } : {}),
        ...(input.gstin !== undefined ? { gstin: input.gstin } : {}),
        ...(input.pan !== undefined ? { pan: input.pan } : {}),
        ...(input.billingAddress !== undefined ? { billingAddress: input.billingAddress } : {}),
        ...(input.stateLabel !== undefined ? { stateLabel: input.stateLabel } : {}),
        ...(input.invoiceEmail !== undefined ? { invoiceEmail: input.invoiceEmail } : {}),
        ...(input.tdsApplicable !== undefined ? { tdsApplicable: input.tdsApplicable } : {}),
        ...(input.tdsRatePercent !== undefined ? { tdsRatePercent: input.tdsRatePercent } : {}),
        ...(input.gstStatus !== undefined ? { gstStatus: input.gstStatus } : {}),
        ...(input.specify !== undefined ? { specify: input.specify } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        updatedBy: input.actorUserId ?? null,
      },
      include: includeParty,
    });
  }
}

export const invoicePartyRepository = new InvoicePartyRepository();

/** @deprecated */
export type CreateAccountingPayeeInput = CreateInvoicePartyInput & { payeeType?: string };
/** @deprecated */
export type UpdateAccountingPayeeInput = UpdateInvoicePartyInput & { payeeType?: string };
/** @deprecated */
export const accountingPayeeRepository = invoicePartyRepository;
