/**
 * Marketing organization binding — never use hardcoded "default".
 */

import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";

export async function resolveMarketingOrganizationId(): Promise<string> {
  const organizationId = (await resolvePilotOrganizationId()).trim();
  if (!organizationId || organizationId === "default") {
    throw Object.assign(new Error("Marketing requires an authenticated Catalyst One organization"), {
      statusCode: 400,
      code: "ORGANIZATION_REQUIRED",
    });
  }
  return organizationId;
}
