#!/usr/bin/env node
/**
 * Local-only seed of Product Owner-approved HOME_LOAN + HOME_LOAN_BT schedules.
 * Do not run against Hostinger production.
 */
import { seedApprovedInitialSchedules } from "../server/services/compass-advantage/compass-advantage-commercial.service.ts";
import { resolvePilotOrganizationId } from "../server/repositories/ecm/organization.repository.ts";

const url = process.env.DATABASE_URL ?? "";
if (/hostinger|rupeecatalyst\.com|5432.*prod/i.test(url) && process.env.COMPASS_ADVANTAGE_ALLOW_PROD_SEED !== "true") {
  console.error("Refusing to seed: DATABASE_URL looks like production.");
  process.exit(1);
}

const organizationId = await resolvePilotOrganizationId();
const result = await seedApprovedInitialSchedules({
  organizationId,
  actor: { userId: "local-seed", label: "local-seed" },
});
console.log("COMPASS Advantage local seed:", result);
