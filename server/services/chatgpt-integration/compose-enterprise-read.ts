/**
 * CO-CHANAKYA-ENTERPRISE-READ-CONTEXT-002 — GPT Action compose for enterprise read context.
 * CO-CHANAKYA-CHATGPT-ENTERPRISE-READ-CLOSURE-038 — entity-aware mode coercion.
 * CO-CHANAKYA-GPT-ENTERPRISE-READ-RESPONSE-SIZE-050 — GPT Action compact response shaping.
 */
import "server-only";

import {
  buildChatGptIntegrationMeta,
  type ChatGptComposeContext,
} from "@/lib/chatgpt-integration/route-handler";
import { resolveChatGptEnterpriseReadMode } from "@/lib/chatgpt-integration/resolve-enterprise-read-mode";
import { compileChanakyaEnterpriseReadContext } from "@/lib/chanakya-enterprise-read-context";
import {
  CHANAKYA_ENTERPRISE_READ_DOMAINS,
  CHANAKYA_CHANGE_PERIODS,
  type ChanakyaEnterpriseReadDomain,
  type ChanakyaChangePeriod,
} from "@/types/chanakya-enterprise-read-context";
import {
  buildCompactGptEnterpriseReadResponse,
  enforceGptActionResponseSizeGuard,
  resolveGptDomainsForView,
  resolveGptEnterpriseReadView,
} from "./compact-enterprise-read";

export async function composeChatGptEnterpriseReadDto(
  ctx: ChatGptComposeContext,
): Promise<Record<string, unknown>> {
  const params = ctx.requestQuery;
  const opportunityRef =
    params?.get("opportunityId") || params?.get("opportunityRef") || null;
  const dealRef = params?.get("dealId") || params?.get("dealRef") || null;
  const requestHint = params?.get("q");

  const compactView = ctx.gptActionLane
    ? resolveGptEnterpriseReadView({
        viewParam: params?.get("view"),
        requestHint,
        dealRef,
        opportunityRef,
      })
    : null;

  const mode = resolveChatGptEnterpriseReadMode({
    modeRaw: params?.get("mode"),
    opportunityRef,
    dealRef,
  });

  const domainsParam = params?.get("domains");
  let domains = domainsParam
    ? (domainsParam
        .split(",")
        .map((d: string) => d.trim())
        .filter((d: string) =>
          (CHANAKYA_ENTERPRISE_READ_DOMAINS as readonly string[]).includes(d),
        ) as ChanakyaEnterpriseReadDomain[])
    : undefined;

  if (ctx.gptActionLane && compactView) {
    domains = resolveGptDomainsForView(compactView, domains);
  } else if (!domains?.length && (opportunityRef?.trim() || dealRef?.trim())) {
    // When ChatGPT asks about a specific case without domains, include the
    // Phase-1 evidence domains that unlock credit / documents / commercial depth.
    domains = [
      "executive",
      "transactions",
      "credit",
      "documents",
      "commercial",
      "execution",
      "relationships",
    ];
  }

  const limitRaw = params?.get("limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;

  const cursorRaw = params?.get("cursor") || params?.get("portfolioPage");
  const portfolioPage = cursorRaw ? Number.parseInt(cursorRaw, 10) : undefined;

  const changePeriodRaw = (params?.get("changePeriod") || "").trim();
  const changePeriod = (CHANAKYA_CHANGE_PERIODS as readonly string[]).includes(
    changePeriodRaw,
  )
    ? (changePeriodRaw as ChanakyaChangePeriod)
    : undefined;

  const includeDocumentExcerpts =
    ctx.gptActionLane && compactView
      ? compactView === "documents" && params?.get("includeDocumentExcerpts") === "1"
      : params?.get("includeDocumentExcerpts") === "1";

  const compiled = await compileChanakyaEnterpriseReadContext({
    mode,
    organizationId: ctx.organizationId,
    opportunityRef,
    dealRef,
    domains,
    includeDocumentExcerpts,
    limit: Number.isFinite(limit) ? limit : undefined,
    portfolioPage: Number.isFinite(portfolioPage) ? portfolioPage : undefined,
    portfolioCursor: cursorRaw,
    changePeriod,
    actorUserId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    correlationId: ctx.requestId,
    requestHint,
    gptCompactView: compactView ?? undefined,
  });

  const requestedEntityRefs = {
    dealRef: dealRef?.trim() || null,
    opportunityRef: opportunityRef?.trim() || null,
  };

  if (ctx.gptActionLane && compactView) {
    const compact = buildCompactGptEnterpriseReadResponse({
      meta: buildChatGptIntegrationMeta(ctx),
      compiled,
      view: compactView,
      resolvedMode: mode,
      requestedEntityRefs,
      requestHint,
    });
    return enforceGptActionResponseSizeGuard(compact);
  }

  return {
    ...buildChatGptIntegrationMeta(ctx),
    ...compiled,
    /** Echo resolved mode so ChatGPT can see coercion from default enterprise. */
    resolvedMode: mode,
    /** Echo entity refs for multi-turn follow-up (CO-CHANAKYA-GPT-CONNECTION-CLOSURE-042). */
    requestedEntityRefs,
  };
}
