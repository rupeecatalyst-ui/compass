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

import {

  assembleChanakyaOpportunity360,

  buildEnterpriseAttentionSummary,

} from "./opportunity-360";

import { assembleChanakyaDeal360 } from "./deal-360";

import {

  buildCommercialAttentionContext,

  buildTransactionAttentionContext,

} from "./transaction-attention";



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



  let opportunity360 = null as ChanakyaEnterpriseReadCompileResult["opportunity360"];

  let deal360 = null as ChanakyaEnterpriseReadCompileResult["deal360"];

  let enterpriseSummary: Record<string, unknown> | null = null;

  let transactionAttention: Record<string, unknown> | null = null;

  let domainSlices: ChanakyaDomainContextSlice[] = [];

  let outcome: "success" | "not_found" | "error" = "success";

  let entityScope: string | null =

    request.dealRef?.trim() || request.opportunityRef?.trim() || null;



  try {

    const wantsOpportunity =

      Boolean(request.opportunityRef?.trim()) &&

      (request.mode === "opportunity" ||

        request.mode === "summary" ||

        request.mode === "domain" ||

        request.mode === "transaction");



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

        includeDocumentExcerpts: Boolean(request.includeDocumentExcerpts),

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

        includeDocumentExcerpts: Boolean(request.includeDocumentExcerpts),

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

      transactionAttention = buildTransactionAttentionContext({

        organizationId: request.organizationId,

        limit: request.limit,

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

          summary: "Transaction-level attention evidence (Radar / EBI rows)",

          payload: transactionAttention,

          limitations: [

            "Evidence from existing Radar classification — no new risk formulas in this sprint.",

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

    privacy: {

      customerMobile: "REDACTED_OR_OMITTED" as const,

      customerEmail: "REDACTED_OR_OMITTED" as const,

      documentBinaries: "SERVER_CONTROLLED_NOT_RETURNED" as const,

    },

    limitations,

  });



  assertNoCustomerContactPiiInAiContext(result);



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

