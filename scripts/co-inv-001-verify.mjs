/**
 * CO-INV-001 — Enterprise Invitation Engine (Wealth Partner Activation Phase 1).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const types = read("src/types/enterprise-invitation-engine.ts");
assert.match(types, /EnterpriseInvitationStatus/);
assert.match(types, /wealth_partner/);
assert.match(types, /internal_employee/);
assert.match(types, /lender_user/);

const consts = read("src/constants/enterprise-invitation-engine/index.ts");
assert.match(consts, /einvtok_/);
assert.match(consts, /ENTERPRISE_INVITATION_DEFAULT_TTL_DAYS/);

const senderSeed = read("src/constants/enterprise-communication/sender-config.ts");
assert.match(senderSeed, /ENTERPRISE_COMMUNICATION_SENDER_SEED/);
assert.match(senderSeed, /CHANNEL_PARTNERS/);
assert.match(senderSeed, /ENTERPRISE_TRANSACTIONAL_FROM_EMAIL/);

const profileSeed = read("src/constants/enterprise-communication-center/profiles.ts");
assert.match(profileSeed, /champion@rupeecatalyst\.com/);

const resolveSender = read("src/lib/enterprise-communication/resolve-sender.ts");
assert.match(resolveSender, /org_config/);
assert.match(resolveSender, /resolveCatalystConnectRedirectUrl/);

const service = read("server/services/invitation-engine/invitation-engine.service.ts");
assert.match(service, /generateLink/);
assert.match(service, /sendInvitation/);
assert.match(service, /cancelInvitation/);
assert.match(service, /activate/);
assert.match(service, /Superseded by regenerated/);

const adapter = read("server/services/invitation-engine/wealth-partner-adapter.ts");
assert.match(adapter, /wealth_partner/);
assert.match(adapter, /lifecycleStatus: \"active\"/);

const schema = read("prisma/schema.prisma");
assert.match(schema, /model EnterpriseInvitation/);
assert.match(schema, /model EnterpriseInvitationAudit/);
assert.match(schema, /model EnterpriseCommunicationConfig/);

const migration = read(
  "prisma/migrations/20260731180000_co_inv_001_enterprise_invitation_engine/migration.sql",
);
assert.match(migration, /enterprise_invitations/);
assert.match(migration, /enterprise_communication_configs/);

const api = read("src/app/api/enterprise-invitations/route.ts");
assert.match(api, /generate/);
assert.match(api, /resend/);
assert.match(api, /cancel/);

const activateApi = read("src/app/api/activate/[token]/route.ts");
assert.match(activateApi, /invitationEngineService\.activate/);

const panel = read(
  "src/components/catalyst-one/enterprise-invitation-engine/wealth-partner-activation-panel.tsx",
);
assert.match(panel, /Generate Activation Link/);
assert.match(panel, /Copy Activation Link/);
assert.match(panel, /Cancel Invitation/);

const workspace = read(
  "src/components/catalyst-one/wealth-partner-registry/wealth-partner-workspace.tsx",
);
assert.match(workspace, /WealthPartnerActivationPanel/);

const activatePage = read("src/app/activate/[token]/page.tsx");
assert.match(activatePage, /ActivateInvitationForm/);

const report = read("docs/co-inv-001/CO-INV-001-INVITATION-ENGINE-READINESS-REPORT.md");
assert.match(report, /Business Acceptance Checklist/);
assert.match(report, /champion@rupeecatalyst\.com/);

/** Ensure UI/services do not hardcode the sender email outside communication config. */
const serviceHardcode = service.includes('"champion@rupeecatalyst.com"');
assert.equal(serviceHardcode, false);

console.log("CO-INV-001 verify: PASS");
