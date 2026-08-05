import { prisma } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { wealthPartnerRegistryRepository } from "@server/repositories/wealth-partner-registry";
import { ecmContactService } from "@server/services/ecm/contact.service";
import {
  WEALTH_PARTNER_BUSINESS_SOURCING_DEFINITION,
  WEALTH_PARTNER_DOCUMENTS_NOTE,
  WEALTH_PARTNER_TYPE_OPTIONS,
} from "@/constants/enterprise-wealth-partner-registry";
import { isBatIsolatedWealthPartner } from "@/constants/enterprise-wealth-partner-bat";
import {
  advanceWealthPartnerLegalClock,
  applyWealthPartnerLegalLifecycle,
  composeWealthPartnerLegalCompliance,
  generateWealthPartnerLegalDocket,
  getLegalDocketFromCompliance,
  mergeComplianceJson,
} from "@/lib/enterprise-wealth-partner-legal-docket";
import type { WealthPartnerLegalLifecycleAction } from "@/types/enterprise-wealth-partner-legal-docket";
import type {
  CreateWealthPartnerBankAccountInput,
  CreateWealthPartnerCommissionInput,
  CreateWealthPartnerInput,
  CreateWealthPartnerNetworkMemberInput,
  EnterpriseWealthPartnerRecord,
  ExistingWealthPartnerSummary,
  UpdateWealthPartnerInput,
  WealthPartnerBusinessSourcingKpis,
  WealthPartnerListQuery,
  WealthPartnerWorkspaceBundle,
} from "@/types/enterprise-wealth-partner-registry";

export class WealthPartnerValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WealthPartnerValidationError";
  }
}

function assertNotBatIsolatedPartner(partner: {
  code?: string | null;
  profileJson?: unknown;
}) {
  if (isBatIsolatedWealthPartner(partner)) {
    throw new WealthPartnerValidationError(
      "BAT / UAT Demo Wealth Partners are excluded from commissions, network mutations, and business operations.",
    );
  }
}

/** CO-WP-006 — Contact/Company already has a Wealth Partner (structured). */
export class WealthPartnerAlreadyExistsError extends Error {
  readonly code = "WEALTH_PARTNER_ALREADY_REGISTERED" as const;
  readonly existing: ExistingWealthPartnerSummary;

  constructor(existing: ExistingWealthPartnerSummary, message?: string) {
    const identityLabel =
      existing.identityKind === "company" ? "Company" : "Contact";
    super(
      message ??
        `This ${identityLabel} is already an active Wealth Partner.`,
    );
    this.name = "WealthPartnerAlreadyExistsError";
    this.existing = existing;
  }
}

function toExistingSummary(
  partner: EnterpriseWealthPartnerRecord,
  reason: ExistingWealthPartnerSummary["reason"],
): ExistingWealthPartnerSummary {
  return {
    partnerId: partner.id,
    code: partner.code,
    displayName: partner.displayName,
    partnerType: partner.partnerType,
    status: partner.status,
    lifecycleStatus: partner.lifecycleStatus,
    operationalStatus: partner.operationalStatus,
    createdAt: partner.createdAt,
    identityKind: partner.identityKind,
    reason,
  };
}

function assertIdentity(input: {
  identityKind: "contact" | "company";
  contactId?: string | null;
  companyId?: string | null;
}) {
  if (input.identityKind === "contact") {
    if (!input.contactId?.trim()) {
      throw new WealthPartnerValidationError(
        "Contact identity requires a Contact from the Enterprise Contact Registry.",
      );
    }
  } else if (input.identityKind === "company") {
    if (!input.companyId?.trim()) {
      throw new WealthPartnerValidationError(
        "Company identity requires a Company from the Enterprise Company Registry.",
      );
    }
  } else {
    throw new WealthPartnerValidationError("identityKind must be contact or company.");
  }
}

export class WealthPartnerRegistryService {
  private async orgId() {
    return resolvePilotOrganizationId();
  }

  async queryPartners(query: WealthPartnerListQuery) {
    return wealthPartnerRegistryRepository.queryPartners(await this.orgId(), query);
  }

  async getPartner(id: string) {
    return wealthPartnerRegistryRepository.getById(await this.orgId(), id);
  }

  /** CO-WP-006 — pre-convert / registry lookup by Contact or Company. */
  async findByIdentity(identity: {
    contactId?: string | null;
    companyId?: string | null;
  }) {
    return wealthPartnerRegistryRepository.findActiveByIdentity(
      await this.orgId(),
      identity,
    );
  }

  async createPartner(input: CreateWealthPartnerInput) {
    assertIdentity(input);
    if (!input.partnerType?.trim()) {
      throw new WealthPartnerValidationError("Wealth Partner Type is required.");
    }
    const allowedTypes = new Set(
      WEALTH_PARTNER_TYPE_OPTIONS.map((o) => o.value as string),
    );
    if (!allowedTypes.has(input.partnerType)) {
      throw new WealthPartnerValidationError(
        `Wealth Partner Type is required. Unknown type: ${input.partnerType}.`,
      );
    }
    const organizationId = await this.orgId();
    const identity = {
      contactId: input.identityKind === "contact" ? input.contactId : null,
      companyId: input.identityKind === "company" ? input.companyId : null,
    };

    // CO-WP-001 validation order:
    // 1) Contact/Company exists → 2) active WP relationship → 3) unique code → 4) create/restore
    let contactRow: {
      id: string;
      name: string;
      mobilePrimary: string | null;
      personalEmail: string | null;
      city: string | null;
      state: string | null;
      pan: string | null;
    } | null = null;
    let companyRow: {
      id: string;
      companyName: string;
      pan: string | null;
      gst: string | null;
      website: string | null;
    } | null = null;

    if (input.identityKind === "contact" && input.contactId) {
      contactRow = await prisma.ecmContact.findFirst({
        where: {
          id: input.contactId,
          organizationId,
          isDeleted: false,
        },
        select: {
          id: true,
          name: true,
          mobilePrimary: true,
          personalEmail: true,
          city: true,
          state: true,
          pan: true,
        },
      });
      if (!contactRow) {
        throw new WealthPartnerValidationError("Selected Contact not found.");
      }
    }

    if (input.identityKind === "company" && input.companyId) {
      companyRow = await prisma.ecmCompany.findFirst({
        where: {
          id: input.companyId,
          organizationId,
          isDeleted: false,
        },
        select: {
          id: true,
          companyName: true,
          pan: true,
          gst: true,
          website: true,
        },
      });
      if (!companyRow) {
        throw new WealthPartnerValidationError("Selected Company not found.");
      }
    }

    const existing = await wealthPartnerRegistryRepository.findActiveByIdentity(
      organizationId,
      identity,
    );
    if (existing) {
      let reason: ExistingWealthPartnerSummary["reason"] = "already_registered";
      if (input.identityKind === "contact" && existing.contactId) {
        const contact = await prisma.ecmContact.findFirst({
          where: { id: existing.contactId, organizationId },
          select: { id: true, isDeleted: true },
        });
        if (!contact || contact.isDeleted) {
          reason = "orphan_identity_missing";
        }
      }
      if (input.identityKind === "company" && existing.companyId) {
        const company = await prisma.ecmCompany.findFirst({
          where: { id: existing.companyId, organizationId },
          select: { id: true, isDeleted: true },
        });
        if (!company || company.isDeleted) {
          reason = "orphan_identity_missing";
        }
      }

      await wealthPartnerRegistryRepository.recordPartnerActivity(
        organizationId,
        existing.id,
        {
          activityType: "conversion_duplicate_detected",
          title: "Conversion attempted — already registered",
          detail: `${existing.code} · ${input.identityKind}`,
          actorUserId: input.createdBy,
          payload: {
            reason,
            contactId: identity.contactId,
            companyId: identity.companyId,
          },
        },
      );

      const message =
        reason === "orphan_identity_missing"
          ? input.identityKind === "contact"
            ? "This Contact is linked to a Wealth Partner whose Contact registry row is missing or deleted. Open the existing Wealth Partner — do not create another."
            : "This Company is linked to a Wealth Partner whose Company registry row is missing or deleted. Open the existing Wealth Partner — do not create another."
          : input.identityKind === "contact"
            ? "This Contact is already an active Wealth Partner."
            : "This Company is already an active Wealth Partner.";

      throw new WealthPartnerAlreadyExistsError(
        toExistingSummary(existing, reason),
        message,
      );
    }

    const softDeleted =
      await wealthPartnerRegistryRepository.findSoftDeletedByIdentity(
        organizationId,
        identity,
      );
    if (softDeleted) {
      // Soft-deleted relationship: reactivate — never create a second WP for same identity.
      const restored =
        await wealthPartnerRegistryRepository.restoreSoftDeletedPartner(
          organizationId,
          softDeleted.id,
          input.createdBy,
        );
      if (restored) {
        return restored;
      }
    }

    if (input.identityKind === "contact" && contactRow) {
      const created = await wealthPartnerRegistryRepository.createPartner(organizationId, {
        ...input,
        displayName: input.displayName?.trim() || contactRow.name,
        identityLabel: input.identityLabel ?? contactRow.name,
        mobile: input.mobile ?? contactRow.mobilePrimary,
        email: input.email ?? contactRow.personalEmail,
        cityLabel: input.cityLabel ?? contactRow.city,
        stateLabel: input.stateLabel ?? contactRow.state,
        pan: input.pan ?? contactRow.pan,
      });
      // CO-ID-001 — additive partner role on Contact (identity SSOT); WP is commercial only.
      try {
        await ecmContactService.assignPartnerRoleForWealthPartner({
          contactId: contactRow.id,
          actorUserId: input.createdBy,
          wealthPartnerId: created.id,
          wealthPartnerCode: created.code,
        });
      } catch (err) {
        console.warn("[wealth-partner-registry] partner role assignment skipped", {
          contactId: contactRow.id,
          partnerId: created.id,
          message: err instanceof Error ? err.message : String(err),
        });
      }
      await wealthPartnerRegistryRepository.recordPartnerActivity(
        organizationId,
        created.id,
        {
          activityType: "wealth_partner_created",
          title: "Wealth Partner profile created",
          detail: `Identity Contact ${contactRow.id} · role partner assigned`,
          actorUserId: input.createdBy,
          payload: { contactId: contactRow.id, identityModel: "CO-ID-001" },
        },
      );
      return created;
    }

    if (input.identityKind === "company" && companyRow) {
      return wealthPartnerRegistryRepository.createPartner(organizationId, {
        ...input,
        displayName: input.displayName?.trim() || companyRow.companyName,
        identityLabel: input.identityLabel ?? companyRow.companyName,
        pan: input.pan ?? companyRow.pan,
        gstin: input.gstin ?? companyRow.gst,
        website: input.website ?? companyRow.website,
      });
    }

    throw new WealthPartnerValidationError("Invalid Wealth Partner identity.");
  }

  async updatePartner(id: string, input: UpdateWealthPartnerInput) {
    const organizationId = await this.orgId();
    const updated = await wealthPartnerRegistryRepository.updatePartner(
      organizationId,
      id,
      input,
    );
    if (!updated) {
      throw new WealthPartnerValidationError("Wealth Partner not found.");
    }
    return updated;
  }

  async addNetworkMember(
    partnerId: string,
    input: CreateWealthPartnerNetworkMemberInput,
  ) {
    assertIdentity({
      identityKind: input.identityKind,
      contactId: input.childContactId,
      companyId: input.childCompanyId,
    });
    const organizationId = await this.orgId();
    const partner = await wealthPartnerRegistryRepository.getById(
      organizationId,
      partnerId,
    );
    if (!partner) {
      throw new WealthPartnerValidationError("Wealth Partner not found.");
    }
    assertNotBatIsolatedPartner(partner);
    return wealthPartnerRegistryRepository.addNetworkMember(
      organizationId,
      partnerId,
      input,
    );
  }

  async createCommission(
    partnerId: string,
    input: CreateWealthPartnerCommissionInput,
  ) {
    const organizationId = await this.orgId();
    const partner = await wealthPartnerRegistryRepository.getById(
      organizationId,
      partnerId,
    );
    if (!partner) {
      throw new WealthPartnerValidationError("Wealth Partner not found.");
    }
    assertNotBatIsolatedPartner(partner);
    if (!input.label?.trim()) {
      throw new WealthPartnerValidationError("Commission label is required.");
    }
    return wealthPartnerRegistryRepository.createCommission(
      organizationId,
      partnerId,
      partner.code,
      input,
    );
  }

  async createBankAccount(
    partnerId: string,
    input: CreateWealthPartnerBankAccountInput,
  ) {
    const organizationId = await this.orgId();
    const partner = await wealthPartnerRegistryRepository.getById(
      organizationId,
      partnerId,
    );
    if (!partner) {
      throw new WealthPartnerValidationError("Wealth Partner not found.");
    }
    assertNotBatIsolatedPartner(partner);
    if (!input.accountName?.trim() || !input.bankName?.trim() || !input.accountNumber?.trim() || !input.ifsc?.trim()) {
      throw new WealthPartnerValidationError(
        "Account name, bank name, account number, and IFSC are required.",
      );
    }
    return wealthPartnerRegistryRepository.createBankAccount(
      organizationId,
      partnerId,
      input,
    );
  }

  /**
   * Read-only Business Sourcing KPIs. Never mutates Opportunity or Deal rows.
   */
  async getBusinessSourcing(
    partnerId: string,
  ): Promise<WealthPartnerBusinessSourcingKpis> {
    const organizationId = await this.orgId();
    const partner = await wealthPartnerRegistryRepository.getById(
      organizationId,
      partnerId,
    );
    if (!partner) {
      throw new WealthPartnerValidationError("Wealth Partner not found.");
    }
    if (isBatIsolatedWealthPartner(partner)) {
      return emptySourcing();
    }

    const opportunityWhere =
      partner.identityKind === "contact" && partner.contactId
        ? {
            organizationId,
            isDeleted: false,
            sourceContactId: partner.contactId,
          }
        : partner.identityKind === "company" && partner.companyId
          ? {
              organizationId,
              isDeleted: false,
              companyId: partner.companyId,
            }
          : null;

    if (!opportunityWhere) {
      return emptySourcing();
    }

    const opportunities = await prisma.enterpriseOpportunity.findMany({
      where: opportunityWhere,
      select: {
        id: true,
        lifecycleStatus: true,
        fulfilmentStatus: true,
        requestedAmount: true,
        createdAt: true,
      },
    });

    const opportunityIds = opportunities.map((o) => o.id);
    const dealWhere =
      partner.identityKind === "contact" && partner.contactId
        ? {
            organizationId,
            isDeleted: false,
            OR: [
              ...(opportunityIds.length
                ? [{ opportunityId: { in: opportunityIds } }]
                : []),
              { sourceContactId: partner.contactId },
            ],
          }
        : opportunityIds.length
          ? {
              organizationId,
              isDeleted: false,
              opportunityId: { in: opportunityIds },
            }
          : null;

    const deals =
      !dealWhere
        ? []
        : await prisma.enterpriseDeal.findMany({
            where: dealWhere,
            select: {
              id: true,
              grossStage: true,
              requestedAmount: true,
              fulfilledAmount: true,
              expectedRevenue: true,
              revenueReceived: true,
              createdAt: true,
            },
          });

    const wonStages = new Set([
      "disbursed",
      "partially_disbursed",
      "closed",
      "won",
    ]);
    const lostStages = new Set(["lost", "cancelled", "rejected"]);
    const activeStages = new Set([
      "identified",
      "logged_in",
      "login",
      "under_process",
      "soft_approved",
      "final_approved",
      "sanctioned",
      "closure_wip",
    ]);

    let totalDisbursement = 0;
    let revenueGenerated = 0;
    let wonCases = 0;
    let lostCases = 0;
    let activeCases = 0;
    for (const d of deals) {
      const stage = (d.grossStage ?? "").toLowerCase();
      const fulfilled =
        d.fulfilledAmount != null ? Number(d.fulfilledAmount) : 0;
      const revenue =
        d.revenueReceived != null ? Number(d.revenueReceived) : 0;
      if (Number.isFinite(fulfilled)) totalDisbursement += fulfilled;
      if (Number.isFinite(revenue)) revenueGenerated += revenue;
      if (wonStages.has(stage) || fulfilled > 0) wonCases += 1;
      else if (lostStages.has(stage)) lostCases += 1;
      else if (activeStages.has(stage) || stage) activeCases += 1;
    }

    const conversionRatio =
      opportunities.length > 0
        ? Math.round((wonCases / opportunities.length) * 1000) / 10
        : 0;

    const monthMap = new Map<
      string,
      { opportunities: number; deals: number; disbursement: number }
    >();
    for (const o of opportunities) {
      const key = `${o.createdAt.getUTCFullYear()}-${String(o.createdAt.getUTCMonth() + 1).padStart(2, "0")}`;
      const cur = monthMap.get(key) ?? {
        opportunities: 0,
        deals: 0,
        disbursement: 0,
      };
      cur.opportunities += 1;
      monthMap.set(key, cur);
    }
    for (const d of deals) {
      const key = `${d.createdAt.getUTCFullYear()}-${String(d.createdAt.getUTCMonth() + 1).padStart(2, "0")}`;
      const cur = monthMap.get(key) ?? {
        opportunities: 0,
        deals: 0,
        disbursement: 0,
      };
      cur.deals += 1;
      const fulfilled =
        d.fulfilledAmount != null ? Number(d.fulfilledAmount) : 0;
      if (Number.isFinite(fulfilled)) cur.disbursement += fulfilled;
      monthMap.set(key, cur);
    }

    const monthlyBusinessTrend = [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, v]) => ({ month, ...v }));

    return {
      totalOpportunitiesGenerated: opportunities.length,
      totalDealsGenerated: deals.length,
      totalDisbursement,
      revenueGenerated,
      conversionRatio,
      activeCases,
      wonCases,
      lostCases,
      monthlyBusinessTrend,
      definition: WEALTH_PARTNER_BUSINESS_SOURCING_DEFINITION,
    };
  }

  private bankSummaryForPartner(
    accounts: Awaited<
      ReturnType<typeof wealthPartnerRegistryRepository.listBankAccounts>
    >,
  ): string {
    if (!accounts.length) return "Not Specified";
    return accounts
      .map(
        (a) =>
          `${a.accountName} · ${a.bankName} · ****${a.accountNumber.slice(-4)} · ${a.ifsc}${
            a.isPrimary ? " (Primary)" : ""
          }`,
      )
      .join("; ");
  }

  /** CO-WP-007 — read-only Legal Compliance projection (advances clock in-memory only). */
  composeLegalCompliance(
    partner: EnterpriseWealthPartnerRecord,
    bankSummary?: string | null,
  ) {
    void bankSummary;
    const docket = advanceWealthPartnerLegalClock(
      getLegalDocketFromCompliance(partner.complianceJson),
    );
    return composeWealthPartnerLegalCompliance({ partner, docket });
  }

  /**
   * CO-WP-007 — Generate / lifecycle Legal Docket.
   * Persists only into complianceJson + activity timeline (no migrations / no live ETD rewrite).
   */
  async runLegalDocketAction(
    partnerId: string,
    input: {
      action: WealthPartnerLegalLifecycleAction | "generate_docket" | "renew_reactivate";
      actorUserId: string;
      documentId?: string | null;
      documentRegistryLinks?: Array<{ documentId: string; documentRegistryRecordId: string }>;
    },
  ): Promise<WealthPartnerWorkspaceBundle> {
    const organizationId = await this.orgId();
    const partner = await wealthPartnerRegistryRepository.getById(
      organizationId,
      partnerId,
    );
    if (!partner) {
      throw new WealthPartnerValidationError("Wealth Partner not found.");
    }

    const bankAccounts = await wealthPartnerRegistryRepository.listBankAccounts(
      organizationId,
      partnerId,
    );
    const bankSummary = this.bankSummaryForPartner(bankAccounts);
    let docket = advanceWealthPartnerLegalClock(
      getLegalDocketFromCompliance(partner.complianceJson),
    );

    if (input.action === "generate_docket" || input.action === "renew_reactivate") {
      const hasPrior = docket.agreement.versionNumber > 0;
      docket = generateWealthPartnerLegalDocket({
        partner,
        bankSummary,
        actorUserId: input.actorUserId,
        previous:
          input.action === "renew_reactivate" || hasPrior ? docket : null,
      });
    } else if (input.action === "link_registry") {
      // Registry id stamping only — no lifecycle transition.
      if (!input.documentRegistryLinks?.length) {
        throw new WealthPartnerValidationError(
          "link_registry requires documentRegistryLinks.",
        );
      }
    } else {
      docket = applyWealthPartnerLegalLifecycle({
        docket,
        action: input.action,
        actorUserId: input.actorUserId,
        partner,
        bankSummary,
        documentId: input.documentId,
      });
    }

    if (input.documentRegistryLinks?.length) {
      const linkMap = new Map(
        input.documentRegistryLinks.map((l) => [l.documentId, l.documentRegistryRecordId]),
      );
      docket = {
        ...docket,
        documents: docket.documents.map((d) => {
          const regId = linkMap.get(d.id);
          return regId ? { ...d, documentRegistryRecordId: regId } : d;
        }),
      };
      if (input.action === "link_registry") {
        docket = {
          ...docket,
          audit: [
            ...docket.audit,
            {
              id: `aud_${Date.now().toString(36)}`,
              action: "generated",
              at: new Date().toISOString(),
              actorUserId: input.actorUserId,
              detail: `Linked ${input.documentRegistryLinks.length} document(s) to Enterprise Document Registry`,
            },
          ],
        };
      }
    }

    const complianceJson = mergeComplianceJson(partner.complianceJson, {
      legalDocket: docket,
      notes:
        typeof (partner.complianceJson as { notes?: string } | null)?.notes === "string"
          ? (partner.complianceJson as { notes?: string }).notes
          : undefined,
      kycStatus:
        typeof (partner.complianceJson as { kycStatus?: string } | null)?.kycStatus ===
        "string"
          ? (partner.complianceJson as { kycStatus?: string }).kycStatus
          : undefined,
    });

    await wealthPartnerRegistryRepository.updatePartner(organizationId, partnerId, {
      complianceJson,
      modifiedBy: input.actorUserId,
    });

    await wealthPartnerRegistryRepository.recordPartnerActivity(
      organizationId,
      partnerId,
      {
        activityType: `legal_${input.action}`,
        title: `Legal Docket · ${input.action.replace(/_/g, " ")}`,
        detail: `Agreement ${docket.agreement.version} · status ${docket.agreement.status}`,
        actorUserId: input.actorUserId,
        payload: {
          action: input.action,
          agreementVersion: docket.agreement.version,
          agreementStatus: docket.agreement.status,
          documentCount: docket.documents.filter((d) => d.status !== "archived").length,
        },
      },
    );

    return this.getWorkspace(partnerId);
  }

  async getWorkspace(partnerId: string): Promise<WealthPartnerWorkspaceBundle> {
    const organizationId = await this.orgId();
    const partner = await wealthPartnerRegistryRepository.getById(
      organizationId,
      partnerId,
    );
    if (!partner) {
      throw new WealthPartnerValidationError("Wealth Partner not found.");
    }

    const [network, commissions, bankAccounts, activities, businessSourcing, docs] =
      await Promise.all([
        wealthPartnerRegistryRepository.listNetwork(organizationId, partnerId),
        wealthPartnerRegistryRepository.listCommissions(organizationId, partnerId),
        wealthPartnerRegistryRepository.listBankAccounts(organizationId, partnerId),
        wealthPartnerRegistryRepository.listActivities(organizationId, partnerId),
        this.getBusinessSourcing(partnerId),
        prisma.enterpriseTransactionDocument.findMany({
          where: {
            organizationId,
            ...(partner.contactId
              ? { contactId: partner.contactId }
              : partner.companyId
                ? { customerId: partner.companyId }
                : { id: "__none__" }),
            status: { not: "deleted" },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            displayName: true,
            categoryLabel: true,
            typeRef: true,
            status: true,
            originalFilename: true,
            createdAt: true,
          },
        }).catch(() => []),
      ]);

    const legalCompliance = this.composeLegalCompliance(
      partner,
      this.bankSummaryForPartner(bankAccounts),
    );

    return {
      partner,
      network,
      commissions,
      bankAccounts,
      activities,
      businessSourcing,
      documents: {
        identityKind: partner.identityKind,
        contactId: partner.contactId,
        companyId: partner.companyId,
        note: WEALTH_PARTNER_DOCUMENTS_NOTE,
        items: docs.map((d) => ({
          id: d.id,
          displayName: d.displayName,
          categoryLabel: d.categoryLabel,
          typeRef: d.typeRef,
          status: d.status,
          originalFilename: d.originalFilename,
          createdAt: d.createdAt.toISOString(),
        })),
      },
      legalCompliance,
    };
  }
}

function emptySourcing(): WealthPartnerBusinessSourcingKpis {
  return {
    totalOpportunitiesGenerated: 0,
    totalDealsGenerated: 0,
    totalDisbursement: 0,
    revenueGenerated: 0,
    conversionRatio: 0,
    activeCases: 0,
    wonCases: 0,
    lostCases: 0,
    monthlyBusinessTrend: [],
    definition: WEALTH_PARTNER_BUSINESS_SOURCING_DEFINITION,
  };
}

export const wealthPartnerRegistryService = new WealthPartnerRegistryService();
