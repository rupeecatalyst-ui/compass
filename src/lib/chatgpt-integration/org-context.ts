/**
 * CO-CHATGPT-INTEGRATION-V1 — Explicit Rupee Catalyst organization context.
 */
import "server-only";

import { ENTERPRISE_PERSISTENCE_ORG_SLUG } from "@/constants/enterprise-persistence";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";

export type ChatGptOrgContext = {
  organizationId: string;
  organizationSlug: string;
};

export async function resolveChatGptOrganizationContext(): Promise<ChatGptOrgContext> {
  const organizationId = await resolvePilotOrganizationId();
  if (!organizationId?.trim()) {
    throw Object.assign(new Error("Organization context could not be established."), {
      statusCode: 503,
      code: "ORG_CONTEXT_UNAVAILABLE",
    });
  }
  return {
    organizationId,
    organizationSlug: ENTERPRISE_PERSISTENCE_ORG_SLUG,
  };
}
