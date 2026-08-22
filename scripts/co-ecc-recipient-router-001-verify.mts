/**
 * CO-ECC-RECIPIENT-001 — Phase 1 RecipientRouter unit verification.
 * No DB · no SMTP · no ENCE enablement · no CHANNEL_PARTNERS mutation.
 *
 * Run: npx tsx scripts/co-ecc-recipient-router-001-verify.mts
 */
import assert from "node:assert/strict";
import { ENCE_EXTERNAL_DELIVERY_ENABLED } from "../src/constants/enterprise-notification-communication-engine/lifecycle";
import { ECC_EVENT_MAPPINGS } from "../src/constants/enterprise-communication-center/events";
import {
  CUSTOMER_FACING_RECIPIENT_EVENTS,
  dedupeRecipients,
  resolveCustomerFacingRecipients,
  resolveCustomerToEmail,
  resolveManagerUserId,
  resolveWealthPartnerEmail,
  type RecipientContactSnapshot,
  type RecipientDealSnapshot,
  type RecipientOpportunitySnapshot,
  type RecipientRouterResolveInput,
  type RecipientUserSnapshot,
} from "../src/lib/enterprise-communication-center/recipient-router";

let passed = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

const baseOpp = (
  over: Partial<RecipientOpportunitySnapshot> = {},
): RecipientOpportunitySnapshot => ({
  id: "opp-1",
  primaryContactId: "contact-1",
  primaryContactEmail: null,
  relationshipManagerUserId: "rm-1",
  primaryOwnerUserId: null,
  sourceWealthPartnerId: null,
  ...over,
});

const contact = (
  over: Partial<RecipientContactSnapshot> = {},
): RecipientContactSnapshot => ({
  id: "contact-1",
  officialEmail: null,
  personalEmail: null,
  isDeleted: false,
  ...over,
});

const user = (over: Partial<RecipientUserSnapshot> = {}): RecipientUserSnapshot => ({
  id: "rm-1",
  email: "rm@rupeecatalyst.com",
  isActive: true,
  ...over,
});

function input(
  over: Partial<RecipientRouterResolveInput> = {},
): RecipientRouterResolveInput {
  return {
    eventType: "customer_notification",
    opportunity: baseOpp(),
    contactsById: {
      "contact-1": contact({ officialEmail: "customer@example.com" }),
    },
    usersById: {
      "rm-1": user(),
    },
    wealthPartnersById: {},
    ...over,
  };
}

check("1. Customer email from officialEmail", () => {
  assert.equal(
    resolveCustomerToEmail({
      contact: contact({
        officialEmail: "official@example.com",
        personalEmail: "personal@example.com",
      }),
      primaryContactEmailFallback: "denorm@example.com",
    }),
    "official@example.com",
  );
});

check("2. Customer email fallback to personalEmail", () => {
  assert.equal(
    resolveCustomerToEmail({
      contact: contact({ officialEmail: null, personalEmail: "personal@example.com" }),
      primaryContactEmailFallback: "denorm@example.com",
    }),
    "personal@example.com",
  );
});

check("3. Customer email final fallback to primaryContactEmail", () => {
  assert.equal(
    resolveCustomerToEmail({
      contact: contact({ officialEmail: " ", personalEmail: null }),
      primaryContactEmailFallback: "denorm@example.com",
    }),
    "denorm@example.com",
  );
});

check("4. Missing customer email → fail closed", () => {
  const result = resolveCustomerFacingRecipients(
    input({
      contactsById: { "contact-1": contact() },
      opportunity: baseOpp({ primaryContactEmail: null }),
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "missing_customer_email");
});

check("5. Deal RM resolution", () => {
  const deal: RecipientDealSnapshot = {
    id: "deal-1",
    opportunityId: "opp-1",
    primaryContactId: "contact-1",
    primaryContactEmail: null,
    relationshipManagerUserId: "deal-rm",
    primaryOwnerUserId: "owner-1",
  };
  const pick = resolveManagerUserId({
    deal,
    opportunity: baseOpp({ relationshipManagerUserId: "opp-rm" }),
  });
  assert.equal(pick.userId, "deal-rm");
  assert.equal(pick.source, "deal_rm");

  const result = resolveCustomerFacingRecipients(
    input({
      deal,
      usersById: {
        "deal-rm": user({ id: "deal-rm", email: "deal-rm@rupeecatalyst.com" }),
      },
    }),
  );
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.cc, ["deal-rm@rupeecatalyst.com"]);
});

check("6. Opportunity RM resolution", () => {
  const pick = resolveManagerUserId({
    deal: null,
    opportunity: baseOpp({ relationshipManagerUserId: "opp-rm" }),
  });
  assert.equal(pick.userId, "opp-rm");
  assert.equal(pick.source, "opportunity_rm");
});

check("7. Owner fallback", () => {
  const pick = resolveManagerUserId({
    deal: null,
    opportunity: baseOpp({
      relationshipManagerUserId: null,
      primaryOwnerUserId: "owner-1",
    }),
  });
  assert.equal(pick.userId, "owner-1");
  assert.equal(pick.source, "opportunity_owner");

  const result = resolveCustomerFacingRecipients(
    input({
      opportunity: baseOpp({
        relationshipManagerUserId: null,
        primaryOwnerUserId: "owner-1",
      }),
      usersById: {
        "owner-1": user({ id: "owner-1", email: "owner@rupeecatalyst.com" }),
      },
    }),
  );
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.cc, ["owner@rupeecatalyst.com"]);
});

check("8. Inactive RM → fail closed", () => {
  const result = resolveCustomerFacingRecipients(
    input({ usersById: { "rm-1": user({ isActive: false }) } }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "missing_or_inactive_transaction_manager");
  }
});

check("9. Missing RM → fail closed (customer TO would resolve but policy blocks)", () => {
  const result = resolveCustomerFacingRecipients(
    input({
      opportunity: baseOpp({
        relationshipManagerUserId: null,
        primaryOwnerUserId: null,
      }),
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "missing_or_inactive_transaction_manager");
  }
});

check("10. Wealth Partner present → CC", () => {
  const result = resolveCustomerFacingRecipients(
    input({
      opportunity: baseOpp({ sourceWealthPartnerId: "wp-1" }),
      wealthPartnersById: {
        "wp-1": { id: "wp-1", email: "partner@example.com", contactId: null },
      },
    }),
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.cc, ["rm@rupeecatalyst.com", "partner@example.com"]);
  }
});

check("11. Wealth Partner absent → no WP CC", () => {
  const result = resolveCustomerFacingRecipients(input());
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.cc, ["rm@rupeecatalyst.com"]);
});

check("12. Wealth Partner missing email → omit WP CC", () => {
  const result = resolveCustomerFacingRecipients(
    input({
      opportunity: baseOpp({ sourceWealthPartnerId: "wp-1" }),
      wealthPartnersById: {
        "wp-1": { id: "wp-1", email: null, contactId: null },
      },
    }),
  );
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.cc, ["rm@rupeecatalyst.com"]);
});

check("13. RM and WP same email → one CC", () => {
  const result = resolveCustomerFacingRecipients(
    input({
      opportunity: baseOpp({ sourceWealthPartnerId: "wp-1" }),
      wealthPartnersById: {
        "wp-1": { id: "wp-1", email: "RM@rupeecatalyst.com", contactId: null },
      },
    }),
  );
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.cc, ["rm@rupeecatalyst.com"]);
});

check("14. Customer email equals RM email → remove from CC", () => {
  const result = resolveCustomerFacingRecipients(
    input({
      contactsById: {
        "contact-1": contact({ officialEmail: "rm@rupeecatalyst.com" }),
      },
    }),
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.to, ["rm@rupeecatalyst.com"]);
    assert.deepEqual(result.cc, []);
  }
});

check("15. Invalid customer email → fail closed", () => {
  const result = resolveCustomerFacingRecipients(
    input({
      contactsById: {
        "contact-1": contact({ officialEmail: "not-an-email" }),
      },
      opportunity: baseOpp({ primaryContactEmail: "also-bad" }),
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "missing_customer_email");
});

check("16. RM reassignment → next resolution uses new RM", () => {
  const first = resolveCustomerFacingRecipients(input());
  assert.equal(first.ok, true);
  if (first.ok) assert.deepEqual(first.cc, ["rm@rupeecatalyst.com"]);

  const second = resolveCustomerFacingRecipients(
    input({
      opportunity: baseOpp({ relationshipManagerUserId: "rm-2" }),
      usersById: {
        "rm-2": user({ id: "rm-2", email: "new-rm@rupeecatalyst.com" }),
      },
    }),
  );
  assert.equal(second.ok, true);
  if (second.ok) assert.deepEqual(second.cc, ["new-rm@rupeecatalyst.com"]);
});

check("17. Wealth Partner reassignment → next resolution uses new WP", () => {
  const first = resolveCustomerFacingRecipients(
    input({
      opportunity: baseOpp({ sourceWealthPartnerId: "wp-1" }),
      wealthPartnersById: {
        "wp-1": { id: "wp-1", email: "old-partner@example.com", contactId: null },
      },
    }),
  );
  assert.equal(first.ok, true);
  if (first.ok) assert.ok(first.cc.includes("old-partner@example.com"));

  const second = resolveCustomerFacingRecipients(
    input({
      opportunity: baseOpp({ sourceWealthPartnerId: "wp-2" }),
      wealthPartnersById: {
        "wp-2": { id: "wp-2", email: "new-partner@example.com", contactId: null },
      },
    }),
  );
  assert.equal(second.ok, true);
  if (second.ok) {
    assert.ok(second.cc.includes("new-partner@example.com"));
    assert.ok(!second.cc.includes("old-partner@example.com"));
  }
});

check("18. Deal event inherits Wealth Partner from linked Opportunity", () => {
  const deal: RecipientDealSnapshot = {
    id: "deal-1",
    opportunityId: "opp-1",
    primaryContactId: "contact-1",
    primaryContactEmail: null,
    relationshipManagerUserId: "deal-rm",
    primaryOwnerUserId: null,
  };
  const result = resolveCustomerFacingRecipients(
    input({
      deal,
      opportunity: baseOpp({ sourceWealthPartnerId: "wp-1" }),
      usersById: {
        "deal-rm": user({ id: "deal-rm", email: "deal-rm@rupeecatalyst.com" }),
      },
      wealthPartnersById: {
        "wp-1": { id: "wp-1", email: "partner@example.com", contactId: null },
      },
    }),
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.senderProfileCode, "CUSTOMERS");
    assert.deepEqual(result.to, ["customer@example.com"]);
    assert.deepEqual(result.cc, ["deal-rm@rupeecatalyst.com", "partner@example.com"]);
  }
});

check("WP email via linked ECM contact when partner.email empty", () => {
  assert.equal(
    resolveWealthPartnerEmail({
      id: "wp-1",
      email: null,
      contactId: "c-wp",
      contact: contact({
        id: "c-wp",
        officialEmail: "wp-via-contact@example.com",
      }),
    }),
    "wp-via-contact@example.com",
  );
});

check("Missing manager user row → fail closed", () => {
  const result = resolveCustomerFacingRecipients(input({ usersById: {} }));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "missing_or_inactive_transaction_manager");
  }
});

check("All Phase-1 events map to CUSTOMERS and resolve", () => {
  for (const eventType of CUSTOMER_FACING_RECIPIENT_EVENTS) {
    const mapping = ECC_EVENT_MAPPINGS.find((m) => m.eventType === eventType);
    assert.ok(mapping, `mapping missing for ${eventType}`);
    assert.equal(mapping!.profileCode, "CUSTOMERS");
    const result = resolveCustomerFacingRecipients(input({ eventType }));
    assert.equal(result.ok, true, eventType);
    if (result.ok) assert.equal(result.senderProfileCode, "CUSTOMERS");
  }
});

check("CHANNEL_PARTNERS events remain mapped and unsupported by Phase-1 router", () => {
  const partnerEvents = ECC_EVENT_MAPPINGS.filter((m) => m.profileCode === "CHANNEL_PARTNERS");
  assert.ok(partnerEvents.length >= 1);
  for (const row of partnerEvents) {
    assert.equal(row.profileCode, "CHANNEL_PARTNERS");
    const result = resolveCustomerFacingRecipients(input({ eventType: row.eventType }));
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "unsupported_event");
  }
});

check("ENCE remains OFF", () => {
  assert.equal(ENCE_EXTERNAL_DELIVERY_ENABLED, false);
});

check("dedupeRecipients strips TO from CC case-insensitively", () => {
  const out = dedupeRecipients({
    to: [" Customer@Example.com "],
    cc: ["customer@example.com", "rm@rupeecatalyst.com", "rm@rupeecatalyst.com"],
  });
  assert.deepEqual(out.to, ["Customer@Example.com"]);
  assert.deepEqual(out.cc, ["rm@rupeecatalyst.com"]);
});

console.log(`\nPassed ${passed} checks.`);
