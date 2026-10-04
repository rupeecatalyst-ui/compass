/**

 * CO-CHANAKYA-ENTERPRISE-READ-CONTEXT-002 — Context Compiler (targeted retrieval).

 */



import "server-only";



import { createCorrelationId } from "@/lib/ops/correlation";

import {

  CHANAKYA_ENTERPRISE_READ_DOMAINS,

  CHANAKYA_FIELD_AVAILABILITY,

  type ChanakyaDomainContextSlice,

  type ChanakyaEnterpriseReadCompileRequest,

  type ChanakyaEnterpriseReadCompileResult,

  type ChanakyaEnterpriseReadDomain,

} from "@/types/chanakya-enterprise-read-context";

import { recordChanakyaEnterpriseReadAudit } from "./audit";

import {

  assertNoCustomerContactPiiInAiContext,

  redactCustomerContactPiiForAiContext,

} from "./redact-pii";

import { assertNoDocumentBinaryInAiContext } from "@/lib/chanakya-document-intelligence/ocr-integration-core";
import { actorMayIncludeDocumentExcerpts } from "@/lib/chanakya-conversation-intelligence/document-excerpt-gate";
import { scopeTransactionAttentionForActor } from "@/lib/chanakya-conversation-intelligence/scope-actor";

import {

  assembleChanakyaOpportunity360,

  buildEnterpriseAttentionSummary,

} from "./opportunity-360";

import { assembleChanakyaDeal360 } from "./deal-360";

import {

  buildCommercialAttentionContext,

  buildTransactionAttentionContext,

} from "./transaction-attention";

import { projectChangeIntelligence } from "./change-intelligence";

import { projectProductLenderIntelligence } from "./product-lender-intelligence";

import { projectCreditIntelligence } from "@/lib/chanakya-credit-intelligence/project-credit-intelligence";

import { composeTransactionExecutiveSnapshotFromCompile } from "./transaction-executive-snapshot";

function resolveDomains(

  request: ChanakyaEnterpriseReadCompileRequest,

): ChanakyaEnterpriseReadDomain[] {

  if (request.domains?.length) {

    return request.domains.filter((d) =>

      (CHANAKYA_ENTERPRISE_READ_DOMAINS as readonly string[]).includes(d),

    ) as ChanakyaEnterpriseReadDomain[];

  }

  if (request.mode === "summary") {

    return ["executive", "transactions"];

  }

  if (request.mode === "opportunity") {

    return [...CHANAKYA_ENTERPRISE_READ_DOMAINS];

  }

  if (request.mode === "transaction") {

    return ["executive", "transactions", "execution", "documents", "commercial"];

  }

  if (request.mode === "enterprise") {

    return ["executive", "transactions", "commercial", "execution"];

  }

  // domain mode — default portfolio slices when no domains specified

  return ["executive", "transactions", "commercial", "documents", "execution"];

}



export async function compileChanakyaEnterpriseReadContext(

  request: ChanakyaEnterpriseReadCompileRequest,

): Promise<ChanakyaEnterpriseReadCompileResult> {

  const correlationId = request.correlationId?.trim() || createCorrelationId();

  const domains = resolveDomains(request);

  const compiledAt = new Date().toISOString();

  const limitations: string[] = [

    "CHANAKYA Enterprise Read Context is read-only — mutations are rejected at the API layer.",

    "Customer mobile and email never enter this context.",

    "Targeted retrieval only — not a full enterprise database dump.",

  ];

  const allowDocumentExcerpts =
    Boolean(request.includeDocumentExcerpts) &&
    actorMayIncludeDocumentExcerpts(request.actorRole);

  if (request.includeDocumentExcerpts && !allowDocumentExcerpts) {
    limitations.push(
      "Document excerpts omitted — actor lacks document download permission.",
    );
  }




  let opportunity360 = null as ChanakyaEnterpriseReadCompileResult["opportunity360"];

  let deal360 = null as ChanakyaEnterpriseReadCompileResult["deal360"];

  let enterpriseSummary: Record<string, unknown> | null = null;

  let transactionAttention: Record<string, unknown> | null = null;

  let changeIntelligence: ChanakyaEnterpriseReadCompileResult["changeIntelligence"] = null;

  let productLenderIntelligence: ChanakyaEnterpriseReadCompileResult["productLenderIntelligence"] =
    null;

  let creditIntelligence: ChanakyaEnterpriseReadCompileResult["creditIntelligence"] = null;

  let transactionExecutiveSnapshot: ChanakyaEnterpriseReadCompileResult["transactionExecutiveSnapshot"] =
    null;

  let domainSlices: ChanakyaDomainContextSlice[] = [];

  let outcome: "success" | "not_found" | "error" = "success";

  let entityScope: string | null =

    request.dealRef?.trim() || request.opportunityRef?.trim() || null;



  try {

    // CO-CHANAKYA-038 — when an opportunityRef is supplied, always load Opportunity 360
    // (including mode=enterprise) so credit / documents / product-lender evidence compile.
    const wantsOpportunity =

      Boolean(request.opportunityRef?.trim()) &&

      (request.mode === "opportunity" ||

        request.mode === "summary" ||

        request.mode === "domain" ||

        request.mode === "transaction" ||

        request.mode === "enterprise");



    if (request.mode === "opportunity" && !request.opportunityRef?.trim()) {

      throw Object.assign(new Error("opportunityRef is required for opportunity mode."), {

        code: "OPPORTUNITY_REQUIRED",

        statusCode: 400,

      });

    }



    if (wantsOpportunity && request.opportunityRef?.trim()) {

      opportunity360 = await assembleChanakyaOpportunity360({

        organizationId: request.organizationId,

        opportunityRef: request.opportunityRef,

        includeDocumentExcerpts: allowDocumentExcerpts,

      });

      if (!opportunity360) {

        if (request.mode === "opportunity") {

          outcome = "not_found";

          limitations.push("Opportunity not found within organization scope.");

        } else {

          limitations.push(

            "Opportunity ref provided but not found within organization scope — continuing with portfolio context.",

          );

        }

      } else {

        entityScope =

          opportunity360.opportunityNumber ?? opportunity360.opportunityId;

        domainSlices = domains

          .map((d) => opportunity360!.slices[d])

          .filter((s): s is ChanakyaDomainContextSlice => Boolean(s));

        limitations.push(...opportunity360.limitations);

      }

    }



    if (request.dealRef?.trim()) {

      deal360 = await assembleChanakyaDeal360({

        organizationId: request.organizationId,

        dealRef: request.dealRef,

        includeDocumentExcerpts: allowDocumentExcerpts,

      });

      if (!deal360) {

        if (request.mode === "transaction" && !opportunity360) {

          outcome = "not_found";

        }

        limitations.push("Deal not found within organization scope.");

      } else {

        entityScope = deal360.dealNumber ?? deal360.dealId;

        limitations.push(...deal360.limitations);

        if (domainSlices.length === 0) {

          domainSlices = domains

            .map((d) => deal360!.slices[d])

            .filter((s): s is ChanakyaDomainContextSlice => Boolean(s));

        }

      }

    }



    const wantsPortfolioAttention =

      request.mode === "enterprise" ||

      request.mode === "summary" ||

      request.mode === "transaction" ||

      (request.mode === "domain" && !opportunity360 && !deal360);



    if (wantsPortfolioAttention) {

      enterpriseSummary = buildEnterpriseAttentionSummary(request.organizationId);

      transactionAttention = await buildTransactionAttentionContext({

        organizationId: request.organizationId,

        limit: request.limit,

        portfolioPage:
          request.portfolioPage ??
          (request.portfolioCursor?.trim()
            ? Number.parseInt(request.portfolioCursor.trim(), 10)
            : undefined),

        opportunityRef: request.opportunityRef,

        opportunityId: opportunity360?.opportunityId ?? null,

        opportunityNumber: opportunity360?.opportunityNumber ?? null,

        dealRef: request.dealRef,

        dealId: deal360?.dealId ?? null,

        dealNumber: deal360?.dealNumber ?? null,

        dealStage:

          (deal360?.slices.execution?.payload?.deal as { grossStage?: string } | undefined)

            ?.grossStage ?? null,

        dealSubStage:

          (deal360?.slices.execution?.payload?.deal as { subStage?: string } | undefined)

            ?.subStage ?? null,

        disbursedAt:

          (deal360?.slices.execution?.payload?.deal as { disbursedAt?: string } | undefined)

            ?.disbursedAt ?? null,

        opportunityRecord: opportunity360

          ? {

              primaryContactId:

                opportunity360.slices.relationships?.payload?.primaryContactId ?? null,

              primaryContactName:

                opportunity360.slices.relationships?.payload?.primaryContactName ?? null,

              productLabel:

                opportunity360.slices.executive?.payload?.productLabel ?? null,

              companyName:

                opportunity360.slices.relationships?.payload?.companyName ?? null,

              employmentTypeCode:

                opportunity360.slices.relationships?.payload?.employmentTypeCode ?? null,

              lifeFinalized:

                opportunity360.slices.execution?.payload?.lifeFinalized ?? false,

            }

          : null,

      });



      if (domains.includes("commercial") || request.mode === "domain") {

        const commercial = await buildCommercialAttentionContext({

          organizationId: request.organizationId,

          limit: request.limit,

        });

        transactionAttention = {

          ...transactionAttention,

          commercialAttention: commercial,

        };

      }

      if (request.actorRole && transactionAttention) {
        transactionAttention = scopeTransactionAttentionForActor(
          transactionAttention,
          {
            userId: request.actorUserId,
            role: request.actorRole,
          },
          request.actorUserId ? [request.actorUserId] : [],
        );
      }



      if (domainSlices.length === 0) {

        domainSlices.push({

          domain: "executive",

          status: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,

          organizationId: request.organizationId,

          compiledAt,

          entityRefs: [],

          summary: "Enterprise attention summary (EBI aggregates)",

          payload: enterpriseSummary,

          limitations: [],

        });

        domainSlices.push({

          domain: "transactions",

          status: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,

          organizationId: request.organizationId,

          compiledAt,

          entityRefs: [],

          summary: "Transaction-level attention evidence (Radar / EBI / joined engines)",

          payload: transactionAttention,

          limitations: [

            "Evidence from existing Radar classification and joined SSOT engines — no new risk formulas.",

          ],

        });

        if (domains.includes("commercial")) {

          domainSlices.push({

            domain: "commercial",

            status: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,

            organizationId: request.organizationId,

            compiledAt,

            entityRefs: [],

            summary: "Commercial / invoice attention (read-only)",

            payload:

              (transactionAttention.commercialAttention as Record<string, unknown>) ||

              {},

            limitations: [],

          });

        }

      }

    }



    if (

      request.mode === "domain" &&

      !request.opportunityRef?.trim() &&

      !request.dealRef?.trim() &&

      domains.length > 0

    ) {

      // Domain mode without entity scope uses portfolio slices already assembled.

      domainSlices = domainSlices.filter((s) => domains.includes(s.domain));

      if (domainSlices.length === 0 && enterpriseSummary) {

        domainSlices.push({

          domain: domains[0]!,

          status: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,

          organizationId: request.organizationId,

          compiledAt,

          entityRefs: [],

          summary: `Domain mode portfolio context for: ${domains.join(", ")}`,

          payload: {

            enterpriseSummary,

            transactionAttention,

          },

          limitations: [],

        });

      }

    }



    const gptView = request.gptCompactView ?? null;
    const needsChangeIntel =
      !gptView ||
      gptView === "changes" ||
      gptView === "deal_summary" ||
      gptView === "opportunity_summary";

    if (needsChangeIntel) {
    changeIntelligence = await projectChangeIntelligence({

      organizationId: request.organizationId,

      period: request.changePeriod ?? "last_7_days",

      opportunityId: opportunity360?.opportunityId ?? null,

      dealId: deal360?.dealId ?? null,

      opportunityNumber: opportunity360?.opportunityNumber ?? null,

      dealNumber: deal360?.dealNumber ?? null,

      limit: request.limit,

      portfolioMode:

        !opportunity360 &&

        !deal360 &&

        (request.mode === "enterprise" ||

          request.mode === "summary" ||

          request.mode === "domain"),

    });
    }

    const needsProductLender = !gptView || gptView === "lenders";
    const needsCredit = !gptView || gptView === "financials";
    const needsExecutiveSnapshot =
      !gptView ||
      gptView === "deal_summary" ||
      gptView === "opportunity_summary";

    if (needsProductLender && (opportunity360?.opportunityId || deal360?.opportunityId || deal360?.dealId)) {
      productLenderIntelligence = await projectProductLenderIntelligence({
        organizationId: request.organizationId,
        opportunityRef:
          opportunity360?.opportunityId ?? deal360?.opportunityId ?? null,
        dealId: deal360?.dealId ?? null,
      });

      const creditOppRef =
        opportunity360?.opportunityId ?? deal360?.opportunityId ?? null;
      if (needsCredit && creditOppRef) {
        creditIntelligence = await projectCreditIntelligence({
          organizationId: request.organizationId,
          opportunityRef: creditOppRef,
        });
      }
    } else if (needsCredit && (opportunity360?.opportunityId || deal360?.opportunityId)) {
      const creditOppRef =
        opportunity360?.opportunityId ?? deal360?.opportunityId ?? null;
      if (creditOppRef) {
        creditIntelligence = await projectCreditIntelligence({
          organizationId: request.organizationId,
          opportunityRef: creditOppRef,
        });
      }
    }

    if (needsExecutiveSnapshot && (opportunity360 || deal360)) {
      transactionExecutiveSnapshot = composeTransactionExecutiveSnapshotFromCompile({
        compiledAt,
        opportunity360,
        deal360,
        transactionAttention,
        changeIntelligence,
        productLenderIntelligence,
        creditIntelligence,
      });
    }

  } catch (err) {

    outcome = "error";

    recordChanakyaEnterpriseReadAudit({

      actorUserId: request.actorUserId,

      sessionId: request.sessionId,

      correlationId,

      mode: request.mode,

      domains,

      entityScope,

      organizationId: request.organizationId,

      outcome: "error",

      summary: err instanceof Error ? err.message : "compile failed",

    });

    throw err;

  }



  const result: ChanakyaEnterpriseReadCompileResult = redactCustomerContactPiiForAiContext({

    mode: request.mode,

    organizationId: request.organizationId,

    compiledAt,

    correlationId,

    readOnly: true as const,

    opportunity360,

    deal360,

    domains: domainSlices,

    enterpriseSummary,

    transactionAttention,

    changeIntelligence,

    productLenderIntelligence,

    creditIntelligence,

    transactionExecutiveSnapshot,

    privacy: {

      customerMobile: "REDACTED_OR_OMITTED" as const,

      customerEmail: "REDACTED_OR_OMITTED" as const,

      documentBinaries: "SERVER_CONTROLLED_NOT_RETURNED" as const,

    },

    limitations,

  });



  assertNoCustomerContactPiiInAiContext(result);

  assertNoDocumentBinaryInAiContext(result);



  recordChanakyaEnterpriseReadAudit({

    actorUserId: request.actorUserId,

    sessionId: request.sessionId,

    correlationId,

    mode: request.mode,

    domains,

    entityScope,

    organizationId: request.organizationId,

    outcome,

    summary: `Compiled ${request.mode} context (${domainSlices.length} domain slice(s))`,

  });



  return result;

}

