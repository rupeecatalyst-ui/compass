import { createHash, randomUUID } from "node:crypto";
import { resolveCompassGatewayOrganizationId } from "./compass-organization.resolver";
import { ecmContactRepository } from "@server/repositories/ecm/contact.repository";
import { enterpriseOpportunityRepository } from "@server/repositories/enterprise-opportunity/enterprise-opportunity.repository";
import { listCompassGatewayPublishedLenderOptions } from "./compass-lender-options";
import { listPartnerOpportunityDocuments } from "@server/services/partner-gateway/partner-ssot-projections";
import { enterpriseTransactionDocumentService } from "@server/services/enterprise-transaction-documents/enterprise-transaction-document.service";
import { enterpriseActivityService } from "@server/services/enterprise-activity/enterprise-activity.service";
import { EAR_EVENT_KINDS, EAR_SOURCE_SYSTEMS } from "@/constants/enterprise-activity-registry";
import {
  COMPASS_OPERATIONAL_HANDOFF_SNAPSHOT_KEY,
  executeCompassFirstSubmissionHandoff,
  snapshotHasOperationalHandoff,
} from "./compass-operational-handoff.service";
import { toDocumentUploadSource } from "@/constants/document-intake";
import { resolveProductUniquenessKey } from "@/constants/opportunity-active-uniqueness";
import {
  mergeResumedContactIdentity,
  parseCompassCustomerIdentity,
  type CompassCustomerIdentity,
} from "@/lib/compass-customer-gateway/customer-identity";
import type { EcmContact } from "@/types/enterprise-contact-master";
import type {
  CompassAnalysisDto,
  CompassJourneyAnswersPatch,
  CompassJourneyConfigDto,
  CompassJourneyStartRequest,
  CompassJourneyStartResponse,
  CompassLodDto,
  CompassProductCode,
  CompassSubmitRequest,
  CompassSubmitResponse,
} from "@/types/compass-customer-gateway";
import { COMPASS_PRODUCT_TO_ENTERPRISE } from "@/types/compass-customer-gateway";
import { getCompassProductDefinition } from "@/constants/compass-customer-gateway/product-registry";
import {
  assertRequestedAmountWithinProductLimit,
  getApprovedMaxRequestedAmountRupees,
  toIntegerRupees,
} from "@/constants/enterprise-product-master";
import { sanitizeCompassJourneyAnswers } from "@/constants/compass-customer-gateway/snapshot-answers";
import {
  COMPASS_WEBSITE_SOURCE_CODE,
  compassSubmitMissingCompany,
} from "@/constants/enterprise-opportunity/company-borrower-create";
import { CompassJourneyError } from "./compass-journey-errors";
import { ecmCompanyRepository } from "@server/repositories/ecm/company.repository";
import {
  formatCompanyDisplayName,
  normalizeCompanyNameKey,
} from "@/lib/enterprise-company-master/name-normalize";
import { buildCompassJourneyConfig } from "./compass-journey-config.service";
import { computeCompassAdvantage } from "./compass-advantage.service";
import { pinAdvantageOnOpportunity } from "@server/services/compass-advantage/compass-advantage-commercial.service";
import { pinAlreadySet } from "@/lib/compass-advantage/pin";
import {
  answersToSnapshotFields,
  projectCompassOpportunityDetail,
} from "./compass-opportunity-projection";
import { projectCompassLod } from "./compass-lod.service";
import { projectCompassRecommendations } from "./compass-recommendations.service";
import {
  issueCompassJourneyToken,
  newJourneyRef,
  verifyCompassJourneyToken,
} from "./compass-session.service";
import { CompassUploadRejectedError, validateCompassCustomerUpload } from "./compass-upload-validation";
import { getFileExtension } from "@/lib/document-registry/file-utils";
import type { CompassJourneySessionClaims } from "@/types/compass-customer-gateway";
import type { Prisma } from "@prisma/client";

const CUSTOMER_PORTAL_UPLOAD_SOURCE = toDocumentUploadSource("DIRECT");
const SUBMITTED_STATUSES = new Set([
  "requirement_captured",
  "in_progress",
  "active",
  "converted_to_deal",
  "on_hold",
]);

function contactRefFromId(contactId: string): string {
  return `cpr_${createHash("sha256").update(contactId).digest("hex").slice(0, 16)}`;
}

function parseLoanAmount(value: unknown): number {
  return toIntegerRupees(value) ?? 0;
}

type ResolvedCompassContact = {
  id: string;
  name: string;
  mobile: string;
  personalEmail: string | null;
};

const COMPASS_CONTACT_ACTOR = "compass-customer-gateway";

async function applyIdentityToExistingContact(
  existing: Pick<EcmContact, "id" | "name" | "personalEmail" | "mobilePrimary"> & {
    isDeleted?: boolean;
    status?: string;
  },
  identity: CompassCustomerIdentity,
): Promise<ResolvedCompassContact> {
  const merged = mergeResumedContactIdentity(
    { name: existing.name, personalEmail: existing.personalEmail },
    identity,
  );
  const restore = Boolean(existing.isDeleted) || existing.status === "archived";
  if (restore || merged.nameChanged || merged.emailChanged) {
    await ecmContactRepository.update(existing.id, {
      ...(restore ? { isDeleted: false, status: "provisional" as const } : {}),
      ...(merged.nameChanged ? { name: merged.name } : {}),
      ...(merged.emailChanged && merged.personalEmail
        ? { personalEmail: merged.personalEmail }
        : {}),
      modifiedBy: COMPASS_CONTACT_ACTOR,
    });
  }
  return {
    id: existing.id,
    name: merged.name,
    mobile: existing.mobilePrimary,
    personalEmail: merged.personalEmail,
  };
}

async function resolveContactByMobile(input: {
  organizationId: string;
  identity: CompassCustomerIdentity;
  city?: string;
}): Promise<ResolvedCompassContact> {
  const { identity } = input;
  const existing = await ecmContactRepository.findIdentityByMobile(
    input.organizationId,
    identity.mobile,
  );
  if (existing && !existing.isDeleted && existing.status !== "archived") {
    return applyIdentityToExistingContact(existing, identity);
  }

  if (existing?.isDeleted || existing?.status === "archived") {
    return applyIdentityToExistingContact(existing, identity);
  }

  try {
    const created = await ecmContactRepository.create({
      organizationId: input.organizationId,
      name: identity.displayName,
      mobilePrimary: identity.mobile,
      ...(identity.personalEmail ? { personalEmail: identity.personalEmail } : {}),
      city: input.city?.trim(),
      status: "provisional",
      roles: ["customer"],
      primaryRole: "customer",
      additionalRoles: [],
      createdBy: COMPASS_CONTACT_ACTOR,
      modifiedBy: COMPASS_CONTACT_ACTOR,
    });
    return {
      id: created.id,
      name: created.name,
      mobile: created.mobilePrimary,
      personalEmail: created.personalEmail ?? null,
    };
  } catch (err) {
    const again = await ecmContactRepository.findByMobile(input.organizationId, identity.mobile);
    if (again) {
      return applyIdentityToExistingContact(again, identity);
    }
    throw err;
  }
}

function asSnapshotRecord(snapshot: unknown): Record<string, unknown> {
  if (snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)) {
    return { ...(snapshot as Record<string, unknown>) };
  }
  return {};
}

async function syncIdentityOntoOpportunity(input: {
  organizationId: string;
  row: {
    id: string;
    snapshot: unknown;
    primaryContactName: string | null;
    primaryContactEmail?: string | null;
  };
  productCode: CompassProductCode;
  contact: ResolvedCompassContact;
}) {
  const snapshot = asSnapshotRecord(input.row.snapshot);
  const existingAnswers =
    snapshot.compassAnswers &&
    typeof snapshot.compassAnswers === "object" &&
    !Array.isArray(snapshot.compassAnswers)
      ? { ...(snapshot.compassAnswers as Record<string, unknown>) }
      : {};
  const nextAnswers: Record<string, string | number | boolean | null | undefined> = {
    ...existingAnswers,
    displayName: input.contact.name,
    mobile: input.contact.mobile,
  };
  if (input.contact.personalEmail) {
    nextAnswers.personalEmail = input.contact.personalEmail;
  }
  const sanitized = sanitizeCompassJourneyAnswers(input.productCode, nextAnswers);
  const mapped = answersToSnapshotFields(sanitized);
  const existingBorrower =
    snapshot.compassBorrowerFields &&
    typeof snapshot.compassBorrowerFields === "object" &&
    !Array.isArray(snapshot.compassBorrowerFields)
      ? { ...(snapshot.compassBorrowerFields as Record<string, string>) }
      : {};
  const nextSnapshot = {
    ...snapshot,
    compassAnswers: { ...existingAnswers, ...sanitized },
    compassBorrowerFields: { ...existingBorrower, ...mapped.borrowerFields },
  };
  const snapshotJson = JSON.parse(JSON.stringify(nextSnapshot)) as Prisma.InputJsonValue;
  const existingEmail = (input.row.primaryContactEmail ?? "").trim();
  await enterpriseOpportunityRepository.updateOpportunity(input.organizationId, input.row.id, {
    primaryContactName: input.contact.name,
    ...(input.contact.personalEmail && !existingEmail
      ? { primaryContactEmail: input.contact.personalEmail }
      : {}),
    snapshot: snapshotJson,
    updatedBy: COMPASS_CONTACT_ACTOR,
  });
}

async function loadOpportunityByRef(organizationId: string, opportunityRef: string) {
  const row = await enterpriseOpportunityRepository.findByNumber(organizationId, opportunityRef);
  if (!row) {
    throw new CompassJourneyError("INVALID_SESSION", "Journey application not found.", 401);
  }
  return row;
}

async function verifySessionClaims(claims: CompassJourneySessionClaims) {
  const organizationId = await resolveCompassGatewayOrganizationId();
  const row = await loadOpportunityByRef(organizationId, claims.opportunityRef);
  const expectedContactRef = contactRefFromId(row.primaryContactId || "");
  if (claims.contactRef !== expectedContactRef) {
    throw new CompassJourneyError(
      "CROSS_CUSTOMER",
      "Journey session does not match this customer.",
      403,
    );
  }
  const mappedProduct = COMPASS_PRODUCT_TO_ENTERPRISE[claims.productCode];
  if (!mappedProduct || row.productCode !== mappedProduct.productCode) {
    throw new CompassJourneyError(
      "PRODUCT_MISMATCH",
      "Journey session does not match this application.",
      403,
    );
  }
  return { organizationId, row };
}

async function findReusableDraft(
  organizationId: string,
  contactId: string,
  productCode: CompassProductCode,
) {
  const enterprise = COMPASS_PRODUCT_TO_ENTERPRISE[productCode];
  const productUniquenessKey = resolveProductUniquenessKey({
    productCode: enterprise.productCode,
    productLabel: enterprise.productLabel,
  });
  const rows = await enterpriseOpportunityRepository.listByContact(organizationId, contactId);
  return (
    rows.find(
      (row) =>
        row.productCode === enterprise.productCode &&
        (row.lifecycleStatus === "dialogue" || row.lifecycleStatus === "draft") &&
        !row.isDeleted &&
        !row.archived,
    ) ??
    rows.find(
      (row) =>
        row.productUniquenessKey === productUniquenessKey &&
        (row.lifecycleStatus === "dialogue" || row.lifecycleStatus === "draft") &&
        !row.isDeleted &&
        !row.archived,
    ) ??
    null
  );
}

async function resolveRelatedCompany(input: {
  organizationId: string;
  contactId: string | null;
  companyName: string;
  constitution?: string;
  annualTurnover?: string;
}) {
  const displayName = formatCompanyDisplayName(input.companyName);
  if (!displayName) return null;
  const nameKey = normalizeCompanyNameKey(displayName);
  let company = await ecmCompanyRepository.findEnabledByNameKey(input.organizationId, nameKey);
  if (!company) {
    company = await ecmCompanyRepository.create({
      organizationId: input.organizationId,
      companyName: displayName,
      constitution: input.constitution?.trim(),
      annualTurnover: input.annualTurnover?.trim(),
      status: "active",
      companyScore: 20,
      createdBy: "compass-customer-gateway",
      modifiedBy: "compass-customer-gateway",
    });
  }
  if (input.contactId) {
    await ecmCompanyRepository.linkContact({
      organizationId: input.organizationId,
      companyId: company.id,
      contactId: input.contactId,
      relationRole: "authorized_signatory",
      createdBy: "compass-customer-gateway",
    });
  }
  return company;
}

async function buildDetail(organizationId: string, opportunityId: string) {
  const row = await enterpriseOpportunityRepository.requireOpportunity(organizationId, opportunityId);
  const documents = await listPartnerOpportunityDocuments({ organizationId, opportunityId });
  return projectCompassOpportunityDetail(row, documents);
}

export const compassJourneyService = {
  getConfig(productCode: CompassProductCode): CompassJourneyConfigDto {
    return buildCompassJourneyConfig(productCode);
  },

  async startJourney(input: CompassJourneyStartRequest): Promise<CompassJourneyStartResponse> {
    if (!input.consentAccepted) {
      throw new CompassJourneyError("CONSENT_REQUIRED", "Consent is required to begin the journey.", 400);
    }
    const parsedIdentity = parseCompassCustomerIdentity(input);
    if (!parsedIdentity.ok) {
      throw new CompassJourneyError(parsedIdentity.code, parsedIdentity.message, 400);
    }
    const definition = getCompassProductDefinition(input.productCode);
    const organizationId = await resolveCompassGatewayOrganizationId();
    let contact: ResolvedCompassContact;
    try {
      contact = await resolveContactByMobile({
        organizationId,
        identity: parsedIdentity.value,
        city: input.city,
      });
    } catch (error) {
      if (error instanceof CompassJourneyError) throw error;
      throw new CompassJourneyError(
        "CONTACT_CREATE_FAILED",
        "Unable to start your application right now. Please try again shortly.",
        502,
      );
    }
    const productUniquenessKey = resolveProductUniquenessKey({
      productCode: definition.enterpriseProductCode,
      productLabel: definition.productLabel,
    });

    const active = productUniquenessKey
      ? await enterpriseOpportunityRepository.findActiveForContactProduct(
          organizationId,
          contact.id,
          productUniquenessKey,
        )
      : null;
    if (active && SUBMITTED_STATUSES.has(active.lifecycleStatus)) {
      throw new CompassJourneyError(
        "ACTIVE_APPLICATION_EXISTS",
        "An active application already exists for this product. Our team will contact you shortly.",
        409,
      );
    }

    let row =
      (await findReusableDraft(organizationId, contact.id, input.productCode)) ??
      null;
    if (!row) {
      try {
        row = await enterpriseOpportunityRepository.createOpportunity({
        organizationId,
        productFamily: "lending",
        productCode: definition.enterpriseProductCode,
        productLabel: definition.productLabel,
        productUniquenessKey,
        transactionType: definition.transactionType,
        requirementStage: "lead_creation",
        lifecycleStatus: "dialogue",
        primaryBorrowerKind: definition.borrowerKind,
        primaryContactId: contact.id,
        primaryContactName: contact.name,
        primaryContactMobile: contact.mobile,
        ...(contact.personalEmail ? { primaryContactEmail: contact.personalEmail } : {}),
        cityLabel: input.city?.trim() || null,
        sourceCode: COMPASS_WEBSITE_SOURCE_CODE,
        sourceCampaignLabel: "COMPASS Website",
        snapshot: {
          compassChannel: "website",
          compassConsentAt: new Date().toISOString(),
          compassLendingType: definition.isSecured ? "secured" : "unsecured",
          compassBorrowerKind: definition.borrowerKind,
          compassAnswers: {
            displayName: contact.name,
            mobile: contact.mobile,
            ...(contact.personalEmail ? { personalEmail: contact.personalEmail } : {}),
          },
          ...(definition.borrowerKind === "company"
            ? { compassPendingCompanyResolution: true }
            : {}),
        },
        actorUserId: null,
      });
      } catch (error) {
        if (error instanceof CompassJourneyError) throw error;
        throw new CompassJourneyError(
          "OPPORTUNITY_CREATE_FAILED",
          "Unable to create your application right now. Please try again shortly.",
          502,
        );
      }
    }

    if (!row) {
      throw new CompassJourneyError(
        "OPPORTUNITY_CREATE_FAILED",
        "Unable to create your application right now. Please try again shortly.",
        502,
      );
    }

    if (!pinAlreadySet(row.snapshot)) {
      try {
        const { snapshot: pinnedSnapshot } = await pinAdvantageOnOpportunity({
          organizationId,
          opportunityId: row.id,
          productCode: definition.enterpriseProductCode,
          caseReceivedAt: row.createdAt,
          snapshot: row.snapshot,
        });
        const snapshotJson = JSON.parse(JSON.stringify(pinnedSnapshot)) as typeof row.snapshot;
        await enterpriseOpportunityRepository.updateOpportunity(organizationId, row.id, {
          snapshot: snapshotJson,
          updatedBy: "compass-customer-gateway",
        });
        row = { ...row, snapshot: snapshotJson };
      } catch {
        /* Missing Advantage tables must not block journey start. */
      }
    }

    await syncIdentityOntoOpportunity({
      organizationId,
      row,
      productCode: input.productCode,
      contact,
    });

    const journeyRef = newJourneyRef();
    const contactRef = contactRefFromId(contact.id);
    const journeySessionToken = issueCompassJourneyToken({
      journeyRef,
      contactRef,
      opportunityRef: row.opportunityNumber,
      productCode: input.productCode,
    });

    return {
      journeySessionToken,
      journeyRef,
      contactRef,
      opportunityRef: row.opportunityNumber,
      otpRequired: process.env.COMPASS_OTP_ENABLED === "true",
      dtoSource: "enterprise_compass_journey",
    };
  },

  async patchAnswers(token: string, patch: CompassJourneyAnswersPatch) {
    const claims = verifyCompassJourneyToken(token);
    const { organizationId, row } = await verifySessionClaims(claims);
    const definition = getCompassProductDefinition(claims.productCode);
    const sanitizedAnswers = sanitizeCompassJourneyAnswers(claims.productCode, patch.answers);
    if (sanitizedAnswers.loanAmount != null) {
      const limit = assertRequestedAmountWithinProductLimit({
        enterpriseProductCode: definition.enterpriseProductCode,
        amountRupees: sanitizedAnswers.loanAmount,
      });
      if (!limit.ok) {
        throw new CompassJourneyError(limit.code, limit.message, 400);
      }
      sanitizedAnswers.loanAmount = limit.amount;
    }
    const mapped = answersToSnapshotFields(sanitizedAnswers);
    mapped.productFields.lendingType = definition.isSecured ? "secured" : "unsecured";
    mapped.productFields.transactionType = definition.transactionType;

    let companyId: string | undefined;
    let companyName: string | undefined;
    if (definition.hasBusinessFields) {
      const resolvedName = mapped.borrowerFields.companyName?.trim();
      if (resolvedName) {
        try {
          const company = await resolveRelatedCompany({
            organizationId,
            contactId: row.primaryContactId,
            companyName: resolvedName,
            constitution: mapped.borrowerFields.constitution,
            annualTurnover: mapped.borrowerFields.annualTurnoverLabel || mapped.borrowerFields.annualTurnover,
          });
          companyId = company?.id;
          companyName = company?.companyName || resolvedName;
        } catch {
          throw new CompassJourneyError(
            "COMPANY_CREATE_FAILED",
            "Unable to save business details right now. Please try again shortly.",
            502,
          );
        }
      }
    }

    const snapshot = {
      ...(typeof row.snapshot === "object" && row.snapshot ? row.snapshot : {}),
      compassBorrowerFields: mapped.borrowerFields,
      compassProductFields: mapped.productFields,
      compassAnswers: sanitizedAnswers,
      compassUpdatedAt: new Date().toISOString(),
      ...(companyId ? { compassPendingCompanyResolution: false } : {}),
    };

    await enterpriseOpportunityRepository.updateOpportunity(organizationId, row.id, {
      snapshot,
      requestedAmount: mapped.requestedAmount,
      cityLabel: mapped.city,
      primaryBorrowerKind: definition.borrowerKind,
      employmentTypeCode: mapped.borrowerFields.employmentTypeCode || row.employmentTypeCode,
      ...(companyId ? { companyId, companyName } : {}),
      updatedBy: "compass-customer-gateway",
    });

    return { saved: true, opportunityRef: row.opportunityNumber };
  },

  async analyze(token: string): Promise<CompassAnalysisDto> {
    const claims = verifyCompassJourneyToken(token);
    const { organizationId, row } = await verifySessionClaims(claims);
    const detail = await buildDetail(organizationId, row.id);
    const snapshotAnswers: Record<string, string | number | undefined> =
      detail.productFields && detail.borrowerFields
        ? {
            ...detail.borrowerFields,
            ...detail.productFields,
            loanAmount: parseLoanAmount(detail.productFields.requestedAmountLabel),
            propertyType: detail.productFields.propertyType,
            monthlyIncome: parseLoanAmount(detail.borrowerFields.monthlyIncomeLabel),
            propertyValue: parseLoanAmount(detail.productFields.propertyValueLabel),
            existingEmi: parseLoanAmount(detail.borrowerFields.existingEmiLabel),
          }
        : {};

    const registryOptions = await listCompassGatewayPublishedLenderOptions(organizationId);
    const recommendations = await projectCompassRecommendations({
      detail,
      productCode: claims.productCode,
      registryOptions,
      city: detail.borrowerFields?.city,
      approxCibilScore: detail.borrowerFields?.approxCibilScore,
    });

    const definition = getCompassProductDefinition(claims.productCode);
    const requestedAmount =
      toIntegerRupees(row.requestedAmount) ?? parseLoanAmount(snapshotAnswers.loanAmount);
    const advantage = await computeCompassAdvantage({
      organizationId,
      opportunityId: row.id,
      opportunityReference: row.opportunityNumber,
      productCode: claims.productCode,
      loanAmount: requestedAmount || undefined,
      caseReceivedAt: row.createdAt,
      snapshot: row.snapshot,
      persist: true,
    });

    const sarathiMessages = recommendations.cards.slice(0, 3).map((card, index) => {
      if (index === 0) {
        return `${card.displayName} is currently our top suggested fit based on what you have shared.`;
      }
      return `${card.displayName} is another suitable option to compare before you proceed.`;
    });

    if (recommendations.status !== "ready") {
      sarathiMessages.push(
        recommendations.message ||
          "We are preparing your personalised lender guidance. A Rupee Catalyst advisor can help you compare options.",
      );
    }

    return {
      recommendations,
      advantage,
      sarathiMessages,
      requestedAmount: requestedAmount || null,
      requestedAmountMax: getApprovedMaxRequestedAmountRupees(definition.enterpriseProductCode),
      dtoSource: "enterprise_compass_analysis",
    };
  },

  async getLod(token: string): Promise<CompassLodDto> {
    const claims = verifyCompassJourneyToken(token);
    const { organizationId, row } = await verifySessionClaims(claims);
    const detail = await buildDetail(organizationId, row.id);
    return projectCompassLod(detail);
  },

  async uploadDocuments(
    token: string,
    files: Array<{
      file: File;
      typeRef?: string | null;
      relativePath?: string | null;
    }>,
  ) {
    const claims = verifyCompassJourneyToken(token);
    const { organizationId, row } = await verifySessionClaims(claims);

    const prepared: Array<{
      entry: (typeof files)[number];
      bytes: Buffer;
      mimeType: string;
    }> = [];

    for (const entry of files) {
      const bytes = Buffer.from(await entry.file.arrayBuffer());
      const validation = validateCompassCustomerUpload({
        fileName: entry.file.name,
        mimeType: entry.file.type || "",
        sizeBytes: bytes.byteLength,
      });
      if (!validation.ok) {
        await enterpriseActivityService.emitBestEffort({
          eventKind: EAR_EVENT_KINDS.DOCUMENTS,
          sourceSystem: EAR_SOURCE_SYSTEMS.DOCUMENT,
          sourceEventId: `compass-upload-rejected:${row.id}:${randomUUID()}`,
          title: "rejected an unsupported COMPASS upload",
          summary: `Unsupported upload attempt for opportunity ${row.opportunityNumber}.`,
          payload: {
            channel: "website_compass",
            reasonCode: validation.code,
            fileExtension: getFileExtension(entry.file.name) || null,
            mimeType: entry.file.type?.trim() || null,
            rejectionCategory: "policy_violation",
          },
          opportunityId: row.id,
          contactId: row.primaryContactId,
          actorName: "COMPASS Customer",
        });
        throw new CompassUploadRejectedError({
          code: validation.code,
          message: validation.message,
          httpStatus: validation.httpStatus,
        });
      }
      prepared.push({
        entry,
        bytes,
        mimeType: validation.mimeType,
      });
    }

    const uploaded: string[] = [];

    for (const { entry, bytes, mimeType } of prepared) {
      const typeRef = entry.typeRef?.trim() || "doc:other:unclassified";
      const displayName = entry.relativePath?.trim() || entry.file.name;
      const persisted = await enterpriseTransactionDocumentService.upsertForOrganization(organizationId, {
        opportunityId: row.id,
        opportunityNumber: row.opportunityNumber,
        clientRecordId: `compass-${row.id}-${typeRef}-${randomUUID().replace(/-/g, "").slice(0, 8)}`,
        contactId: row.primaryContactId,
        customerId: row.primaryContactId,
        typeRef,
        categoryLabel: entry.relativePath?.includes("/")
          ? entry.relativePath.split("/")[0] || "COMPASS Upload"
          : "COMPASS Upload",
        originalFilename: entry.file.name,
        displayName,
        mimeType,
        fileSizeBytes: bytes.byteLength,
        status: "active",
        uploadSource: CUSTOMER_PORTAL_UPLOAD_SOURCE,
        uploadedBy: "compass-customer",
        contentBase64: bytes.toString("base64"),
      });
      uploaded.push(displayName);

      await enterpriseActivityService.emitBestEffort({
        eventKind: EAR_EVENT_KINDS.DOCUMENTS,
        sourceSystem: EAR_SOURCE_SYSTEMS.DOCUMENT,
        sourceEventId: `compass-doc:${persisted.id}:uploaded`,
        title: "uploaded a document via COMPASS",
        summary: `Customer uploaded ${displayName} for opportunity ${row.opportunityNumber}.`,
        payload: {
          channel: "website_compass",
          typeRef,
          relativePath: entry.relativePath?.trim() || null,
          uploadSource: CUSTOMER_PORTAL_UPLOAD_SOURCE,
        },
        opportunityId: row.id,
        contactId: row.primaryContactId,
        documentId: persisted.id,
        actorName: "COMPASS Customer",
      });
    }

    return {
      uploadedCount: uploaded.length,
      uploaded,
      lod: await this.getLod(token),
    };
  },

  async submit(token: string, input: CompassSubmitRequest): Promise<CompassSubmitResponse> {
    if (!input.consentAccepted || !input.declarationsAccepted) {
      throw new CompassJourneyError(
        "CONSENT_REQUIRED",
        "Consent and declarations are required to submit.",
        400,
      );
    }
    const claims = verifyCompassJourneyToken(token);
    const { organizationId, row } = await verifySessionClaims(claims);
    const definition = getCompassProductDefinition(claims.productCode);
    if (
      compassSubmitMissingCompany({
        primaryBorrowerKind: definition.borrowerKind,
        companyId: row.companyId,
      })
    ) {
      throw new CompassJourneyError(
        "COMPANY_REQUIRED",
        "Please provide your business name before submitting.",
        400,
      );
    }

    if (SUBMITTED_STATUSES.has(row.lifecycleStatus)) {
      const lod = await this.getLod(token);
      return {
        submitted: true,
        reference: row.opportunityNumber,
        message: "Your application has already been submitted. We will contact you with next steps.",
        pendingItems:
          lod.mandatoryPending > 0
            ? [`${lod.mandatoryPending} mandatory document(s) still pending`]
            : [],
        dtoSource: "enterprise_compass_submission",
      };
    }

    const mapped = answersToSnapshotFields(
      sanitizeCompassJourneyAnswers(
        claims.productCode,
        ((row.snapshot as Record<string, unknown> | null)?.compassAnswers as Record<
          string,
          string | number | boolean | null
        >) || {},
      ),
    );

    const previousLifecycle = row.lifecycleStatus;
    const alreadyHandedOff = snapshotHasOperationalHandoff(row.snapshot);
    const nextSnapshot = {
      ...(typeof row.snapshot === "object" && row.snapshot ? row.snapshot : {}),
      compassSubmittedAt: new Date().toISOString(),
      compassSubmissionConsent: true,
      ...(alreadyHandedOff ? {} : { [COMPASS_OPERATIONAL_HANDOFF_SNAPSHOT_KEY]: new Date().toISOString() }),
    };

    const updated = await enterpriseOpportunityRepository.updateOpportunity(organizationId, row.id, {
      lifecycleStatus: "requirement_captured",
      requirementStage: "requirement_captured",
      requestedAmount: mapped.requestedAmount ?? undefined,
      cityLabel: mapped.city ?? undefined,
      snapshot: nextSnapshot,
      updatedBy: "compass-customer-gateway",
    });

    if (!alreadyHandedOff) {
      await executeCompassFirstSubmissionHandoff({
        organizationId,
        opportunity: {
          id: updated.id,
          opportunityNumber: updated.opportunityNumber,
          primaryContactId: updated.primaryContactId ?? null,
          primaryContactName: updated.primaryContactName ?? null,
          productLabel: updated.productLabel ?? null,
          requestedAmount: updated.requestedAmount,
        },
        previousLifecycle,
        actorUserId: null,
        skipLifecycleEar: true,
      });
    }

    const lod = await this.getLod(token);
    const pendingItems =
      lod.mandatoryPending > 0
        ? [`${lod.mandatoryPending} mandatory document(s) still pending`]
        : [];

    return {
      submitted: true,
      reference: row.opportunityNumber,
      message:
        "Thank you. Your application has been received by Rupee Catalyst. Our team will review your details and contact you with next steps.",
      pendingItems,
      dtoSource: "enterprise_compass_submission",
    };
  },
};
