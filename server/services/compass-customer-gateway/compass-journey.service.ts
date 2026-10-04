import { createHash, randomUUID } from "node:crypto";
import { readCompassOtpConfig } from "@/lib/compass-otp/adapter";
import {
  omitSensitiveResumeAnswers,
  quarantineInapplicableAnswers,
  recommendationReadiness,
  sanitizePublicPayload,
  stableDocumentIdempotencyKey,
  type PublicQuestionField,
} from "@/lib/compass-customer-gateway/public-question-plan";
import {
  isCompassPlaceholderName,
  parseCompassDisplayName,
  parseCompassOptionalEmail,
} from "@/lib/compass-customer-gateway/customer-identity";
import { assertCompassCustomerRateLimit } from "./compass-customer-rate-limit";
import { hasOtpVerificationProof } from "./compass-otp.service";
import { persistCompassAdvantageCommitment } from "@server/services/compass-advantage/commit-opportunity-advantage";
import { prisma } from "@server/lib/prisma";
import { resolveCompassGatewayOrganizationId } from "./compass-organization.resolver";
import { ecmContactRepository } from "@server/repositories/ecm/contact.repository";
import { enterpriseOpportunityRepository } from "@server/repositories/enterprise-opportunity/enterprise-opportunity.repository";
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
import { normalizeEcmMobile } from "@/lib/enterprise-contact-master";
import {
  decideCampaignIdentity,
  knownCampaignEmailMaySkipEntry,
  verifyCampaignRecipientToken,
  type CampaignRecipientClaims,
} from "@/lib/product-journey/campaign-link";
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
import {
  COMPASS_ACTIVE_PRODUCT_CODES,
  getCompassProductDefinition,
} from "@/constants/compass-customer-gateway/product-registry";
import {
  assertRequestedAmountWithinProductLimit,
  getApprovedMaxRequestedAmountRupees,
  toIntegerRupees,
} from "@/constants/enterprise-product-master";
import {
  publishedJourneyAnswerAuthority,
  sanitizeCompassJourneyAnswers,
} from "@/constants/compass-customer-gateway/snapshot-answers";
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
import { buildCompassJourneyConfig, buildPublishedProductJourneyConfig } from "./compass-journey-config.service";
import {
  journeyPublicationState,
  recordMissingJourneyPin,
  resolvePublicRecommendationExecutor,
  resolvePublishedJourney,
} from "@/lib/product-journey/publication";
import { ProductJourneyStoreError } from "@/lib/product-journey/store";
import { computeCompassAdvantage } from "./compass-advantage.service";
import { pinAdvantageOnOpportunity } from "@server/services/compass-advantage/compass-advantage-commercial.service";
import { pinAlreadySet } from "@/lib/compass-advantage/pin";
import {
  answersToSnapshotFields,
  projectCompassOpportunityDetail,
} from "./compass-opportunity-projection";
import { selectReusableDraft } from "@/lib/compass-customer-gateway/draft-reuse";
import { projectCompassLod } from "./compass-lod.service";
import { listCompassGatewayPublishedLenderOptions } from "./compass-lender-options";
import { projectRegistryProgrammeRecommendations } from "./compass-recommendations.service";
import { lenderRegistryService } from "@server/services/lender-registry/lender-registry.service";
import { isPublishedCommercialProgram } from "@/lib/enterprise-lender-registry/program-architecture";
import {
  compassContactRef,
  issueCompassJourneyToken,
  newJourneyRef,
  sessionOwnsContact,
  verifyCompassJourneyToken,
} from "./compass-session.service";
import {
  assertMalwareScanPolicy,
  CompassUploadRejectedError,
  validateCompassCustomerUpload,
} from "./compass-upload-validation";
import { getFileExtension } from "@/lib/document-registry/file-utils";
import type { CompassJourneySessionClaims } from "@/types/compass-customer-gateway";

const CUSTOMER_PORTAL_UPLOAD_SOURCE = toDocumentUploadSource("DIRECT");
const SUBMITTED_STATUSES = new Set([
  "requirement_captured",
  "in_progress",
  "active",
  "converted_to_deal",
  "on_hold",
]);

function contactRefFromId(contactId: string): string {
  return compassContactRef(contactId);
}

function campaignLinkSecret(): string {
  const secret =
    process.env.COMPASS_JOURNEY_SESSION_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) {
    throw new CompassJourneyError(
      "CAMPAIGN_LINK_UNAVAILABLE",
      "Campaign links are not available right now.",
      503,
    );
  }
  return secret;
}

function sameCampaignProduct(left: string, right: string): boolean {
  const normalize = (value: string) => value.trim().toLowerCase().replace(/-/g, "_");
  return normalize(left) === normalize(right);
}

function parseLoanAmount(value: unknown): number {
  return toIntegerRupees(value) ?? 0;
}

async function resolveContactByMobile(input: {
  organizationId: string;
  mobile: string;
  displayName?: string;
  city?: string;
}): Promise<{ id: string; name: string; mobile: string }> {
  const mobile = normalizeEcmMobile(input.mobile);
  if (!mobile || mobile.length < 10) {
    throw new CompassJourneyError("INVALID_MOBILE", "A valid mobile number is required.", 400);
  }

  const existing = await ecmContactRepository.findIdentityByMobile(input.organizationId, mobile);
  if (existing && !existing.isDeleted && existing.status !== "archived") {
    return {
      id: existing.id,
      name: existing.name,
      mobile: existing.mobilePrimary,
    };
  }

  if (existing?.isDeleted) {
    await prisma.ecmContact.update({
      where: { id: existing.id },
      data: { isDeleted: false, status: "provisional" },
    });
    return {
      id: existing.id,
      name: existing.name,
      mobile: existing.mobilePrimary,
    };
  }

  try {
    const created = await ecmContactRepository.create({
      organizationId: input.organizationId,
      name: input.displayName?.trim() || "COMPASS Prospect",
      mobilePrimary: mobile,
      city: input.city?.trim(),
      status: "provisional",
      roles: ["customer"],
      primaryRole: "customer",
      additionalRoles: [],
      createdBy: "compass-customer-gateway",
      modifiedBy: "compass-customer-gateway",
    });
    return { id: created.id, name: created.name, mobile: created.mobilePrimary };
  } catch (err) {
    const again = await ecmContactRepository.findByMobile(input.organizationId, mobile);
    if (again) {
      return { id: again.id, name: again.name, mobile: again.mobilePrimary };
    }
    throw err;
  }
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
  if (!sessionOwnsContact(claims.contactRef, row.primaryContactId || "")) {
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
  return selectReusableDraft(rows, enterprise.productCode, productUniquenessKey);
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

function pinnedJourneyVersion(snapshot: unknown): number | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const value = (snapshot as { compassJourneyVersion?: unknown }).compassJourneyVersion;
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

async function requirePinnedJourney(
  organizationId: string,
  productCode: string,
  snapshot: unknown,
): Promise<number | null> {
  const journeyCode = (COMPASS_ACTIVE_PRODUCT_CODES as readonly string[]).includes(productCode)
    ? getCompassProductDefinition(productCode as CompassProductCode).enterpriseProductCode
    : productCode;
  const pin = pinnedJourneyVersion(snapshot);
  const state = await journeyPublicationState(organizationId, journeyCode);
  if (pin == null) {
    if (state === "none") return null;
    await recordMissingJourneyPin({
      organizationId,
      productCode: journeyCode,
      pinnedVersion: null,
      actorId: "compass-customer-gateway",
    });
    throw new CompassJourneyError(
      "JOURNEY_PIN_REQUIRED",
      "This application is not pinned to a journey version.",
      409,
    );
  }
  const pinned = await resolvePublishedJourney(organizationId, journeyCode, pin);
  if (!pinned) {
    await recordMissingJourneyPin({
      organizationId,
      productCode: journeyCode,
      pinnedVersion: pin,
      actorId: "compass-customer-gateway",
    });
    throw new CompassJourneyError(
      "JOURNEY_PIN_MISSING",
      "The pinned journey version is not available.",
      404,
    );
  }
  return pin;
}

async function resolveCampaignHandoff(token: string, productCode: string) {
  try {
    const claims = verifyCampaignRecipientToken(token, campaignLinkSecret());
    if (!sameCampaignProduct(claims.productCode, productCode)) {
      return { valid: false as const, emailOnFile: false, emailIndependentlyVerified: false as const };
    }
    const recipient = await ecmContactRepository.findById(claims.recipientRef);
    return {
      valid: true as const,
      emailOnFile: Boolean(recipient && !recipient.isDeleted && recipient.personalEmail),
      emailIndependentlyVerified: false as const,
      campaignId: claims.campaignId,
      sourceCode: claims.sourceCode,
      campaignLabel: claims.campaignLabel,
    };
  } catch (error) {
    if (error instanceof CompassJourneyError && error.code === "CAMPAIGN_LINK_UNAVAILABLE") throw error;
    return { valid: false as const, emailOnFile: false, emailIndependentlyVerified: false as const };
  }
}

async function resolveCampaignForStart(
  token: string | undefined,
  productCode: string,
  enterpriseProductCode: string,
  enteredMobile: string,
): Promise<{
  claims: CampaignRecipientClaims;
  decision: "matched" | "separate";
  emailOnFile: string | null;
  recipientId: string | null;
  recipientName: string | null;
} | null> {
  const trimmed = token?.trim();
  if (!trimmed) return null;
  let claims: CampaignRecipientClaims;
  try {
    claims = verifyCampaignRecipientToken(trimmed, campaignLinkSecret());
  } catch (error) {
    if (error instanceof CompassJourneyError) throw error;
    throw new CompassJourneyError("CAMPAIGN_TOKEN_INVALID", "This campaign link is not valid.", 401);
  }
  if (
    !sameCampaignProduct(claims.productCode, productCode) &&
    !sameCampaignProduct(claims.productCode, enterpriseProductCode)
  ) {
    throw new CompassJourneyError(
      "CAMPAIGN_TOKEN_INVALID",
      "This campaign link is not valid for this product.",
      401,
    );
  }
  const recipient = await ecmContactRepository.findById(claims.recipientRef);
  const decision = decideCampaignIdentity({
    recipientMobile: recipient && !recipient.isDeleted ? recipient.mobilePrimary : null,
    enteredMobile,
  });
  if (decision === "conflict") {
    throw new CompassJourneyError(
      "IDENTITY_CONFLICT",
      "This campaign link belongs to a different mobile number. Neither profile was changed.",
      409,
    );
  }
  return {
    claims,
    decision,
    emailOnFile: decision === "matched" && recipient?.personalEmail ? recipient.personalEmail : null,
    recipientId: decision === "matched" && recipient && !recipient.isDeleted ? recipient.id : null,
    recipientName: decision === "matched" && recipient ? recipient.name : null,
  };
}

function campaignEmailForResponse(
  campaign: { decision: "matched" | "separate"; emailOnFile: string | null } | null,
): { value: string; independentlyVerified: false } | null {
  if (!campaign) return null;
  const skip = knownCampaignEmailMaySkipEntry({
    decision: campaign.decision,
    emailOnFile: campaign.emailOnFile,
  });
  if (!skip.skip || !campaign.emailOnFile) return null;
  return { value: campaign.emailOnFile, independentlyVerified: false };
}

export const compassJourneyService = {
  async getConfig(
    productCode: string,
    pinnedVersion?: number | null,
    options?: { campaignToken?: string | null; requirePublished?: boolean },
  ): Promise<CompassJourneyConfigDto> {
    const organizationId = await resolveCompassGatewayOrganizationId();
    let dto: CompassJourneyConfigDto | null;
    try {
      dto = (COMPASS_ACTIVE_PRODUCT_CODES as readonly string[]).includes(productCode)
        ? await buildCompassJourneyConfig(organizationId, productCode as CompassProductCode, pinnedVersion)
        : await buildPublishedProductJourneyConfig(organizationId, productCode, pinnedVersion);
    } catch (error) {
      if (error instanceof ProductJourneyStoreError) {
        throw new CompassJourneyError("JOURNEY_UNAVAILABLE", "This product journey is not published.", 404);
      }
      throw error;
    }
    if (!dto || dto.journeyUnavailable || (pinnedVersion != null && !dto.journeyVersion)) {
      throw new CompassJourneyError(
        "JOURNEY_UNAVAILABLE",
        "This product journey is not published.",
        404,
      );
    }
    if (
      !(COMPASS_ACTIVE_PRODUCT_CODES as readonly string[]).includes(productCode) &&
      !dto.journeyVersion
    ) {
      throw new CompassJourneyError(
        "JOURNEY_UNAVAILABLE",
        "This product journey is not published.",
        404,
      );
    }
    if (options?.requirePublished && !dto.journeyVersion) {
      throw new CompassJourneyError(
        "JOURNEY_UNAVAILABLE",
        "This product journey is not published.",
        404,
      );
    }
    const campaignToken = options?.campaignToken?.trim();
    if (campaignToken) {
      dto = {
        ...dto,
        campaignHandoff: await resolveCampaignHandoff(campaignToken, productCode),
      };
    }
    return dto;
  },

  async startJourney(input: CompassJourneyStartRequest): Promise<CompassJourneyStartResponse> {
    assertCompassCustomerRateLimit(input.mobile || "anonymous");
    const organizationIdForJourney = await resolveCompassGatewayOrganizationId();
    const definition = getCompassProductDefinition(input.productCode);
    if ((await journeyPublicationState(organizationIdForJourney, definition.enterpriseProductCode)) === "unavailable") {
      throw new CompassJourneyError(
        "JOURNEY_UNAVAILABLE",
        "This product journey is not published.",
        404,
      );
    }
    const journeyConfig = await buildCompassJourneyConfig(organizationIdForJourney, input.productCode);
    const otpOn = journeyConfig.otpVerification === "on";
    if (otpOn) {
      if (
        !readCompassOtpConfig().deliveryEnabled ||
        !hasOtpVerificationProof(input.mobile, input.otpVerificationToken)
      ) {
        throw new CompassJourneyError(
          "OTP_UNAVAILABLE",
          "We cannot verify your mobile number yet. Please try again later.",
          503,
        );
      }
    }
    const campaign = await resolveCampaignForStart(input.campaignToken, input.productCode, definition.enterpriseProductCode, input.mobile);
    const organizationId = await resolveCompassGatewayOrganizationId();
    let contact: { id: string; name: string; mobile: string };
    try {
      if (campaign?.decision === "matched" && campaign.recipientId) {
        contact = {
          id: campaign.recipientId,
          name: campaign.recipientName || input.displayName?.trim() || "COMPASS Prospect",
          mobile: normalizeEcmMobile(input.mobile) || input.mobile,
        };
      } else {
        contact = await resolveContactByMobile({
          organizationId,
          mobile: input.mobile,
          displayName: input.displayName,
          city: input.city,
        });
      }
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
        cityLabel: input.city?.trim() || null,
        sourceCode: campaign?.claims.sourceCode || COMPASS_WEBSITE_SOURCE_CODE,
        sourceCampaignLabel: campaign?.claims.campaignLabel || "COMPASS Website",
        // Final compass-consent-v1 is written only by submit, after the review declarations.
        snapshot: {
          compassChannel: campaign ? "campaign" : "website",
          ...(campaign
            ? {
                compassCampaignId: campaign.claims.campaignId,
                compassCampaignRecipientRef: campaign.claims.recipientRef,
                compassCampaignIdentity: campaign.decision,
              }
            : {}),
          compassMobileVerified: otpOn,
          compassProductCode: definition.enterpriseProductCode,
          ...(journeyConfig.journeyVersion
            ? { compassJourneyVersion: journeyConfig.journeyVersion }
            : {}),
          compassLendingType: definition.isSecured ? "secured" : "unsecured",
          compassBorrowerKind: definition.borrowerKind,
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
      otpRequired: otpOn,
      mobileVerified: otpOn,
      campaignEmail: campaignEmailForResponse(campaign),
      dtoSource: "enterprise_compass_journey",
    };
  },

  async patchAnswers(token: string, patch: CompassJourneyAnswersPatch) {
    const claims = verifyCompassJourneyToken(token);
    const { organizationId, row } = await verifySessionClaims(claims);
    const definition = getCompassProductDefinition(claims.productCode);
    const pin = await requirePinnedJourney(organizationId, claims.productCode, row.snapshot);
    const config = await buildCompassJourneyConfig(organizationId, claims.productCode, pin);
    const configuredIds = config.fields.map((field) => field.fieldId);
    const sanitizedAnswers: Record<string, string | number | boolean | null> = {
      ...quarantineInapplicableAnswers(
        config.fields as PublicQuestionField[],
        sanitizeCompassJourneyAnswers(
          claims.productCode,
          patch.answers,
          configuredIds,
          publishedJourneyAnswerAuthority(config),
        ),
      ).answers,
    };
    for (const key of ["requestedAmountLabel", "loanAmount"] as const) {
      if (sanitizedAnswers[key] == null) continue;
      const limit = assertRequestedAmountWithinProductLimit({
        enterpriseProductCode: definition.enterpriseProductCode,
        amountRupees: sanitizedAnswers[key],
      });
      if (!limit.ok) {
        throw new CompassJourneyError(limit.code, limit.message, 400);
      }
      sanitizedAnswers[key] = key === "loanAmount" ? limit.amount : String(limit.amount);
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

    const displayName = parseCompassDisplayName(
      typeof sanitizedAnswers.displayName === "string" ? sanitizedAnswers.displayName : undefined,
    );
    const personalEmail = parseCompassOptionalEmail(
      typeof sanitizedAnswers.personalEmail === "string" ? sanitizedAnswers.personalEmail : undefined,
    );
    if (!personalEmail.ok) {
      throw new CompassJourneyError("INVALID_EMAIL", personalEmail.message, 400);
    }
    if (row.primaryContactId && (displayName.ok || (personalEmail.ok && personalEmail.value))) {
      await ecmContactRepository.update(row.primaryContactId, {
        ...(displayName.ok ? { name: displayName.value } : {}),
        ...(personalEmail.ok && personalEmail.value ? { personalEmail: personalEmail.value } : {}),
        modifiedBy: "compass-customer-gateway",
      });
    }

    await enterpriseOpportunityRepository.updateOpportunity(organizationId, row.id, {
      snapshot,
      requestedAmount: mapped.requestedAmount,
      cityLabel: mapped.city,
      primaryBorrowerKind: definition.borrowerKind,
      employmentTypeCode: mapped.borrowerFields.employmentTypeCode || row.employmentTypeCode,
      ...(displayName.ok ? { primaryContactName: displayName.value } : {}),
      ...(personalEmail.ok && personalEmail.value ? { primaryContactEmail: personalEmail.value } : {}),
      ...(companyId ? { companyId, companyName } : {}),
      updatedBy: "compass-customer-gateway",
    });

    return { saved: true, opportunityRef: row.opportunityNumber };
  },

  async resume(token: string) {
    const claims = verifyCompassJourneyToken(token);
    const { organizationId, row } = await verifySessionClaims(claims);
    await requirePinnedJourney(organizationId, claims.productCode, row.snapshot);
    const stored =
      row.snapshot && typeof row.snapshot === "object" && "compassAnswers" in row.snapshot
        ? ((row.snapshot as { compassAnswers?: Record<string, unknown> }).compassAnswers ?? {})
        : {};
    const answers = omitSensitiveResumeAnswers(stored);
    const name = isCompassPlaceholderName(row.primaryContactName) ? null : row.primaryContactName;
    return sanitizePublicPayload({
      opportunityRef: row.opportunityNumber,
      mobileVerified: row.snapshot &&
        typeof row.snapshot === "object" &&
        (row.snapshot as { compassMobileVerified?: boolean }).compassMobileVerified === true,
      displayName: name,
      personalEmail: row.primaryContactEmail,
      answers,
      journeyVersion: pinnedJourneyVersion(row.snapshot),
      dtoSource: "enterprise_compass_resume",
    });
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

    const definition = getCompassProductDefinition(claims.productCode);
    const pin = await requirePinnedJourney(organizationId, claims.productCode, row.snapshot);
    const config = await buildCompassJourneyConfig(organizationId, claims.productCode, pin);
    const storedAnswers =
      row.snapshot && typeof row.snapshot === "object" && "compassAnswers" in row.snapshot
        ? ((row.snapshot as { compassAnswers?: Record<string, string | number | boolean | null> })
            .compassAnswers ?? {})
        : {};
    const readiness = recommendationReadiness(config.fields as PublicQuestionField[], {
      ...storedAnswers,
      ...snapshotAnswers,
    });
    const requestedAmount = parseLoanAmount(snapshotAnswers.loanAmount) || null;
    const requestedAmountMax = getApprovedMaxRequestedAmountRupees(definition.enterpriseProductCode);
    if (!readiness.ready) {
      return sanitizePublicPayload({
        recommendations: {
          status: "pending" as const,
          message: "A few details are still needed before we can prepare guidance.",
          cards: [],
          dtoSource: "enterprise_compass_recommendations" as const,
        },
        advantage: null,
        sarathiMessages: [],
        requestedAmount,
        requestedAmountMax,
        missingPublicFieldKeys: readiness.missingPublicFieldKeys,
        dtoSource: "enterprise_compass_analysis" as const,
      });
    }

    const advantage = await computeCompassAdvantage({
      organizationId,
      opportunityId: row.id,
      opportunityReference: row.opportunityNumber,
      productCode: claims.productCode,
      loanAmount: requestedAmount ?? undefined,
      caseReceivedAt: row.createdAt,
      snapshot: row.snapshot,
      persist: true,
    });
    await persistCompassAdvantageCommitment({
      organizationId,
      opportunityId: row.id,
      productCode: definition.enterpriseProductCode,
      advantage,
    });

    let recommendations: CompassAnalysisDto["recommendations"];
    const published =
      pin == null
        ? null
        : await resolvePublishedJourney(organizationId, definition.enterpriseProductCode, pin);
    const executor = resolvePublicRecommendationExecutor(
      pin == null ? null : (published?.recommendationBinding ?? "unavailable"),
    );
    if (executor === "none") {
      recommendations = {
        status: "unavailable",
        message: "Published programme guidance is not configured for this application.",
        cards: [],
        dtoSource: "enterprise_compass_recommendations",
      };
    } else {
      try {
        const lenders = await listCompassGatewayPublishedLenderOptions(organizationId);
        const listed = await lenderRegistryService.queryPrograms({ pageSize: 500, enabled: true });
        const programs = listed.items.filter(isPublishedCommercialProgram);
        recommendations = projectRegistryProgrammeRecommendations({
          detail,
          lenders,
          programs,
        });
      } catch {
        recommendations = {
          status: "unavailable",
          message: "Published lender programmes are temporarily unavailable.",
          cards: [],
          dtoSource: "enterprise_compass_recommendations",
        };
      }
    }

    return sanitizePublicPayload({
      recommendations,
      advantage,
      sarathiMessages: [],
      requestedAmount,
      requestedAmountMax,
      missingPublicFieldKeys: [],
      dtoSource: "enterprise_compass_analysis" as const,
    });
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
      assertMalwareScanPolicy();
      const typeRef = entry.typeRef?.trim() || "doc:other:unclassified";
      const displayName = entry.relativePath?.trim() || entry.file.name;
      const contentSha256 = createHash("sha256").update(bytes).digest("hex");
      const persisted = await enterpriseTransactionDocumentService.upsertForOrganization(organizationId, {
        opportunityId: row.id,
        opportunityNumber: row.opportunityNumber,
        clientRecordId: stableDocumentIdempotencyKey({
          opportunityId: row.id,
          typeRef,
          contentSha256,
        }),
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
    if (!input.consentAccepted || !input.lenderShareAccepted || !input.declarationsAccepted) {
      throw new CompassJourneyError(
        "CONSENT_REQUIRED",
        "Privacy, lender share, and declarations are required to submit.",
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

    if (isCompassPlaceholderName(row.primaryContactName)) {
      throw new CompassJourneyError(
        "NAME_REQUIRED",
        "Please enter your full name before submitting.",
        400,
      );
    }

    const storedAnswers =
      ((row.snapshot as Record<string, unknown> | null)?.compassAnswers as Record<
        string,
        string | number | boolean | null
      >) || {};
    const pin = pinnedJourneyVersion(row.snapshot);
    const pinnedConfig =
      pin == null
        ? null
        : await buildCompassJourneyConfig(organizationId, claims.productCode, pin);
    if (pin != null) await requirePinnedJourney(organizationId, claims.productCode, row.snapshot);
    const mapped = answersToSnapshotFields(
      sanitizeCompassJourneyAnswers(
        claims.productCode,
        storedAnswers,
        pinnedConfig?.fields.map((field) => field.fieldId),
        publishedJourneyAnswerAuthority(pinnedConfig),
      ),
    );

    const previousLifecycle = row.lifecycleStatus;
    const alreadyHandedOff = snapshotHasOperationalHandoff(row.snapshot);
    const acceptedAt = new Date().toISOString();
    const nextSnapshot = {
      ...(typeof row.snapshot === "object" && row.snapshot ? row.snapshot : {}),
      compassSubmittedAt: acceptedAt,
      compassSubmissionConsent: true,
      compassConsentVersion: "compass-consent-v1",
      compassConsentAt: acceptedAt,
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

  async talkToExpert(token: string) {
    const claims = verifyCompassJourneyToken(token);
    const { organizationId, row } = await verifySessionClaims(claims);
    const { requestTalkToExpert } = await import("./compass-expert-sla.service");
    return requestTalkToExpert({
      organizationId,
      opportunityId: row.id,
    });
  },
};
