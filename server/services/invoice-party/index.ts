/**
 * CO-ARCH-003 Phase 2B Sprint 1 — Accounting Invoice Party Master service.
 */
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import {
  invoicePartyRepository,
  type CreateInvoicePartyInput,
  type UpdateInvoicePartyInput,
} from "@server/repositories/invoice-party";

function serializeInvoiceParty(row: {
  id: string;
  organizationId: string;
  contactId: string | null;
  companyId: string | null;
  partyType: string;
  legalName: string;
  billingName: string;
  displayName: string;
  gstin: string | null;
  pan: string | null;
  billingAddress: string | null;
  stateLabel: string | null;
  invoiceEmail: string | null;
  tdsApplicable: boolean;
  tdsRatePercent: number | null;
  gstStatus: string | null;
  specify: string | null;
  notes: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  contact?: { id: string; name: string; mobilePrimary?: string | null } | null;
  company?: { id: string; companyName: string } | null;
} | null) {
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organizationId,
    contactId: row.contactId,
    companyId: row.companyId,
    partyType: row.partyType,
    /** @deprecated alias */
    payeeType: row.partyType,
    legalName: row.legalName,
    billingName: row.billingName,
    displayName: row.displayName,
    gstin: row.gstin,
    pan: row.pan,
    billingAddress: row.billingAddress,
    stateLabel: row.stateLabel,
    invoiceEmail: row.invoiceEmail,
    tdsApplicable: row.tdsApplicable,
    tdsRatePercent: row.tdsRatePercent,
    gstStatus: row.gstStatus,
    specify: row.specify,
    notes: row.notes,
    enabled: row.enabled,
    contact: row.contact
      ? {
          id: row.contact.id,
          name: row.contact.name,
          mobilePrimary: row.contact.mobilePrimary ?? undefined,
        }
      : null,
    company: row.company ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class InvoicePartyService {
  private async orgId() {
    return resolvePilotOrganizationId();
  }

  async list(query?: { q?: string; enabled?: boolean; activeOnly?: boolean }) {
    const organizationId = await this.orgId();
    if (query?.activeOnly) {
      const items = await invoicePartyRepository.listActive(organizationId);
      return { items: items.map((r) => serializeInvoiceParty(r)!) };
    }
    const items = await invoicePartyRepository.listAll(organizationId, {
      q: query?.q,
      enabled: query?.enabled,
    });
    return { items: items.map((r) => serializeInvoiceParty(r)!) };
  }

  async get(id: string) {
    const organizationId = await this.orgId();
    const row = await invoicePartyRepository.findById(organizationId, id);
    if (!row) {
      throw Object.assign(new Error("Invoice Party not found"), {
        status: 404,
        code: "INVOICE_PARTY_NOT_FOUND",
      });
    }
    return serializeInvoiceParty(row);
  }

  async create(body: Record<string, unknown>, actorUserId: string) {
    const organizationId = await this.orgId();
    const legalName = String(body.legalName ?? "").trim();
    const billingName = String(body.billingName ?? body.legalName ?? "").trim();
    const displayName = String(body.displayName ?? billingName ?? legalName).trim();
    const partyType =
      String(body.partyType ?? body.payeeType ?? "other").trim() || "other";
    if (!legalName) throw Object.assign(new Error("legalName is required"), { status: 400 });
    if (!body.contactId && !body.companyId) {
      throw Object.assign(
        new Error("Link a Contact or Company from the Enterprise Registry"),
        { status: 400, code: "REGISTRY_LINK_REQUIRED" },
      );
    }

    const input: CreateInvoicePartyInput = {
      organizationId,
      partyType,
      legalName,
      billingName: billingName || legalName,
      displayName: displayName || legalName,
      contactId: body.contactId ? String(body.contactId) : null,
      companyId: body.companyId ? String(body.companyId) : null,
      gstin: body.gstin ? String(body.gstin) : null,
      pan: body.pan ? String(body.pan) : null,
      billingAddress: body.billingAddress ? String(body.billingAddress) : null,
      stateLabel: body.stateLabel ? String(body.stateLabel) : null,
      invoiceEmail: body.invoiceEmail ? String(body.invoiceEmail) : null,
      tdsApplicable: Boolean(body.tdsApplicable),
      tdsRatePercent:
        body.tdsRatePercent !== undefined && body.tdsRatePercent !== null
          ? Number(body.tdsRatePercent)
          : null,
      gstStatus: body.gstStatus ? String(body.gstStatus) : null,
      specify: body.specify ? String(body.specify) : null,
      notes: body.notes ? String(body.notes) : null,
      enabled: body.enabled === undefined ? true : Boolean(body.enabled),
      actorUserId,
    };

    const created = await invoicePartyRepository.create(input);
    return serializeInvoiceParty(created);
  }

  async update(id: string, body: Record<string, unknown>, actorUserId: string) {
    const organizationId = await this.orgId();
    const input: UpdateInvoicePartyInput = {
      actorUserId,
      ...(body.partyType !== undefined || body.payeeType !== undefined
        ? { partyType: String(body.partyType ?? body.payeeType) }
        : {}),
      ...(body.legalName !== undefined ? { legalName: String(body.legalName) } : {}),
      ...(body.billingName !== undefined ? { billingName: String(body.billingName) } : {}),
      ...(body.displayName !== undefined ? { displayName: String(body.displayName) } : {}),
      ...(body.contactId !== undefined
        ? { contactId: body.contactId ? String(body.contactId) : null }
        : {}),
      ...(body.companyId !== undefined
        ? { companyId: body.companyId ? String(body.companyId) : null }
        : {}),
      ...(body.gstin !== undefined ? { gstin: body.gstin ? String(body.gstin) : null } : {}),
      ...(body.pan !== undefined ? { pan: body.pan ? String(body.pan) : null } : {}),
      ...(body.billingAddress !== undefined
        ? { billingAddress: body.billingAddress ? String(body.billingAddress) : null }
        : {}),
      ...(body.stateLabel !== undefined
        ? { stateLabel: body.stateLabel ? String(body.stateLabel) : null }
        : {}),
      ...(body.invoiceEmail !== undefined
        ? { invoiceEmail: body.invoiceEmail ? String(body.invoiceEmail) : null }
        : {}),
      ...(body.tdsApplicable !== undefined ? { tdsApplicable: Boolean(body.tdsApplicable) } : {}),
      ...(body.tdsRatePercent !== undefined
        ? {
            tdsRatePercent:
              body.tdsRatePercent === null || body.tdsRatePercent === ""
                ? null
                : Number(body.tdsRatePercent),
          }
        : {}),
      ...(body.gstStatus !== undefined
        ? { gstStatus: body.gstStatus ? String(body.gstStatus) : null }
        : {}),
      ...(body.specify !== undefined ? { specify: body.specify ? String(body.specify) : null } : {}),
      ...(body.notes !== undefined ? { notes: body.notes ? String(body.notes) : null } : {}),
      ...(body.enabled !== undefined ? { enabled: Boolean(body.enabled) } : {}),
    };
    const updated = await invoicePartyRepository.update(organizationId, id, input);
    return serializeInvoiceParty(updated);
  }
}

export const invoicePartyService = new InvoicePartyService();

/** @deprecated */
export const accountingPayeeService = invoicePartyService;
