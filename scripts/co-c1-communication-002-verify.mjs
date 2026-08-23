/**
 * CO-C1-COMMUNICATION-002 — static + matcher verification for universal inbound email.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const checks = [
  ["prisma inbound ledger", read("prisma/schema.prisma"), "EnterpriseInboundEmailMessage"],
  ["migration", read("prisma/migrations/20260822120000_co_c1_communication_002_inbound_email/migration.sql"), "enterprise_inbound_email_messages"],
  ["transaction matcher", read("src/lib/enterprise-inbound-email/transaction-matcher.ts"), "matchInboundEmailTransaction"],
  ["imap service", read("server/services/enterprise-inbound-email/imap-mailbox.service.ts"), "fetchUnreadInboundEmails"],
  ["ingestion orchestrator", read("server/services/enterprise-inbound-email/inbound-email-ingestion.service.ts"), "pollAndIngest"],
  ["inbound cron route", read("src/app/api/cron/inbound-email/route.ts"), "pollAndIngest"],
  ["inbound server settings api", read("src/app/api/admin/enterprise-communication/inbound-server/route.ts"), "getSettingsDto"],
  ["inbound imap probe api", read("src/app/api/admin/enterprise-communication/inbound-server/probe/route.ts"), "probeInboundImapConnection"],
  ["inbound server config service", read("server/services/enterprise-inbound-email/inbound-email-server-config.service.ts"), "resolveRuntimeImapConfig"],
  ["imap password env only", read("src/lib/enterprise-inbound-email/imap-secret-resolver.ts"), "INBOUND_EMAIL_IMAP_PASSWORD"],
  ["incoming email ui panel", read("src/components/catalyst-one/admin/enterprise-communication/incoming-email-server-panel.tsx"), "Incoming Email Server"],
  ["server config migration", read("prisma/migrations/20260823120000_co_c1_communication_002_inbound_server_config/migration.sql"), "enterprise_inbound_email_server_configs"],
  ["admin review queue", read("src/app/api/admin/enterprise-communication/inbound-emails/route.ts"), "listReviewQueue"],
  ["admin manual match", read("src/app/api/admin/enterprise-communication/inbound-emails/[inboundEmailId]/match/route.ts"), "manuallyMatchEmail"],
  ["ear inbound source", read("src/constants/enterprise-activity-registry/index.ts"), "INBOUND_EMAIL"],
  ["idempotent message key", read("prisma/schema.prisma"), "eie_org_message_uidx"],
  ["outbound message-id preserved", read("server/services/enterprise-communication-center/smtp-transport.service.ts"), "Message-ID:"],
  ["ene customer received", read("src/types/enterprise-notification-engine.ts"), "CUSTOMER_EMAIL_RECEIVED"],
  ["incoming email ear emit", read("server/services/enterprise-inbound-email/inbound-email-ingestion.service.ts"), "emitInboundEarEvent"],
  ["activity dialogue nav", read("src/config/navigation.ts"), "Activity & Dialogue"],
  ["dialogue redirects to activity", read("src/app/(dashboard)/dialogue/page.tsx"), "ROUTES.ACTIVITY"],
  ["inbound email detail api", read("src/app/api/enterprise-inbound-emails/[inboundEmailId]/route.ts"), "enterpriseInboundEmailMessage"],
  ["activity dialogue quick access", read("src/components/catalyst-one/activity-dialogue/activity-dialogue-quick-access.tsx"), "ActivityDialogueQuickAccess"],
];

let failed = 0;
for (const [label, content, needle] of checks) {
  if (!content.includes(needle)) {
    console.error(`FAIL  ${label} missing ${needle}`);
    failed++;
  } else {
    console.log(`PASS  ${label}`);
  }
}

const ingestion = read("server/services/enterprise-inbound-email/inbound-email-ingestion.service.ts");
if (ingestion.includes("ingestOneEmail({") && ingestion.includes("manuallyMatchEmail") && !ingestion.includes("processMatchedInbound")) {
  console.error("FAIL  manual match must use processMatchedInbound");
  failed++;
} else {
  console.log("PASS  manual match uses processMatchedInbound");
}

const { matchInboundEmailTransaction } = await import(
  "../src/lib/enterprise-inbound-email/transaction-matcher.ts"
);

const oppId = "opp-test-001";
const dealId = "deal-test-001";

const threadMatch = matchInboundEmailTransaction({
  fromEmail: "rahulakapoor@gmail.com",
  subject: "Re: Your loan update",
  textBody: "Thanks",
  inReplyTo: "<c1.abc@rupeecatalyst.com>",
  referencesHeader: null,
  outboundThread: {
    sourceEventId: "c1.abc",
    opportunityId: oppId,
    dealId,
    contactId: "contact-1",
    messageId: "<c1.abc@rupeecatalyst.com>",
  },
  senderContacts: { contactIds: ["contact-1"], lenderContactIds: [], wealthPartnerIds: [], isInternalUser: false },
});
if (threadMatch.status !== "matched" || threadMatch.reason !== "outbound_thread_headers") {
  console.error("FAIL  thread header matching");
  failed++;
} else {
  console.log("PASS  thread header matching");
}

const dealRefMatch = matchInboundEmailTransaction({
  fromEmail: "rahulakapoor@gmail.com",
  subject: "Documents for DEAL-2026-000103",
  textBody: "",
  inReplyTo: null,
  referencesHeader: null,
  referenceMatches: {
    dealsByNumber: {
      "DEAL-2026-000103": {
        opportunityId: oppId,
        opportunityNumber: "OPP-2026-000095",
        dealId,
        dealNumber: "DEAL-2026-000103",
        primaryContactId: "contact-1",
      },
    },
    opportunitiesByNumber: {},
  },
  senderContacts: { contactIds: ["contact-1"], lenderContactIds: [], wealthPartnerIds: [], isInternalUser: false },
});
if (dealRefMatch.status !== "matched" || dealRefMatch.reason !== "deal_reference") {
  console.error("FAIL  deal reference matching");
  failed++;
} else {
  console.log("PASS  deal reference matching");
}

const ambiguous = matchInboundEmailTransaction({
  fromEmail: "rahulakapoor@gmail.com",
  subject: "OPP-2026-000095 and DEAL-2026-000103",
  textBody: "",
  inReplyTo: null,
  referencesHeader: null,
  referenceMatches: { dealsByNumber: {}, opportunitiesByNumber: {} },
  senderContacts: { contactIds: ["contact-1"], lenderContactIds: [], wealthPartnerIds: [], isInternalUser: false },
});
if (ambiguous.status !== "needs_review") {
  console.error("FAIL  ambiguous reference must need review");
  failed++;
} else {
  console.log("PASS  ambiguous reference needs review");
}

const internal = matchInboundEmailTransaction({
  fromEmail: "ops@rupeecatalyst.com",
  subject: "Internal note",
  textBody: "",
  inReplyTo: null,
  referencesHeader: null,
  senderContacts: { contactIds: [], lenderContactIds: [], wealthPartnerIds: [], isInternalUser: true },
});
if (internal.status !== "processed" || internal.senderRole !== "internal") {
  console.error("FAIL  internal sender classification");
  failed++;
} else {
  console.log("PASS  internal sender classification");
}

if (failed) {
  console.error(`\nCO-C1-COMMUNICATION-002: FAIL (${failed})`);
  process.exit(1);
}
console.log("\nCO-C1-COMMUNICATION-002: PASS");
