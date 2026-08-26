/**
 * CO-CHANAKYA-ENTERPRISE-READ-CONTEXT-002 — GPT Action compose for enterprise read context.
 */
import "server-only";

import {
  buildChatGptIntegrationMeta,
  type ChatGptComposeContext,
} from "@/lib/chatgpt-integration/route-handler";
import { compileChanakyaEnterpriseReadContext } from "@/lib/chanakya-enterprise-read-context";
import {
  CHANAKYA_ENTERPRISE_READ_DOMAINS,
  CHANAKYA_ENTERPRISE_READ_MODES,
  type ChanakyaEnterpriseReadDomain,
  type ChanakyaEnterpriseReadMode,
} from "@/types/chanakya-enterprise-read-context";

export async function composeChatGptEnterpriseReadDto(
  ctx: ChatGptComposeContext,
): Promise<Record<string, unknown>> {
  const params = ctx.requestQuery;
  const modeRaw = (params?.get("mode") || "enterprise").trim();
  const mode = (CHANAKYA_ENTERPRISE_READ_MODES as readonly string[]).includes(modeRaw)
    ? (modeRaw as ChanakyaEnterpriseReadMode)
    : "enterprise";

  const domainsParam = params?.get("domains");
  const domains = domainsParam
    ? (domainsParam
        .split(",")
        .map((d: string) => d.trim())
        .filter((d: string) =>
          (CHANAKYA_ENTERPRISE_READ_DOMAINS as readonly string[]).includes(d),
        ) as ChanakyaEnterpriseReadDomain[])
    : undefined;

  const limitRaw = params?.get("limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;

  const compiled = await compileChanakyaEnterpriseReadContext({
    mode,
    organizationId: ctx.organizationId,
    opportunityRef: params?.get("opportunityId") || params?.get("opportunityRef"),
    dealRef: params?.get("dealId") || params?.get("dealRef"),
    domains,
    includeDocumentExcerpts: params?.get("includeDocumentExcerpts") === "1",
    limit: Number.isFinite(limit) ? limit : undefined,
    actorUserId: ctx.actor.userId,
    correlationId: ctx.requestId,
    requestHint: params?.get("q"),
  });

  return {
    ...buildChatGptIntegrationMeta(ctx),
    ...compiled,
  };
}
