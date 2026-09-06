/**
 * CO-MARKETING-BAT-001 — Deterministic local fixture dataset.
 * Fictitious identities only. Never production customers. Never live Google Sheets.
 */

export const MARKETING_BAT_ORG_ID = "org-rc-bat-001-fixture";
export const MARKETING_BAT_OTHER_ORG_ID = "org-rc-bat-001-other";
export const MARKETING_BAT_WORKBOOK_ID = "fixture-marketing-master";
export const MARKETING_BAT_DOMAIN = "bat.example.rupeecatalyst.test";
export const MARKETING_BAT_ELIGIBLE_COUNT = 275;
export const MARKETING_BAT_HOME_LOAN_TAB_ID = "tab_home_loan";

export const MARKETING_BAT_HEADERS = [
  "External Key",
  "Full Name",
  "First Name",
  "Email",
  "Mobile",
  "Location",
  "Product Interest",
  "Consent",
] as const;

export const MARKETING_BAT_ACTORS = {
  creator: {
    userId: "user-bat-creator",
    role: "ADMIN",
    organizationId: MARKETING_BAT_ORG_ID,
    marketingPermissions: [],
  },
  approver: {
    userId: "user-bat-approver",
    role: "ADMIN",
    organizationId: MARKETING_BAT_ORG_ID,
    marketingPermissions: [
      "admin.marketing.campaign.approve",
      "admin.marketing.campaign.schedule",
      "admin.marketing.campaign.run",
      "admin.marketing.campaign.pause",
      "admin.marketing.campaign.stop",
      "admin.marketing.campaign.retry",
      "admin.marketing.recipient.pii.view",
    ],
  },
  operator: {
    userId: "user-bat-operator",
    role: "ADMIN",
    organizationId: MARKETING_BAT_ORG_ID,
    marketingPermissions: ["admin.marketing.recipient.pii.view"],
  },
  noAccess: {
    userId: "user-bat-no-marketing",
    role: "USER",
    organizationId: MARKETING_BAT_ORG_ID,
    marketingPermissions: [],
  },
  superAdmin: {
    userId: "user-bat-super-admin",
    role: "SUPER_ADMIN",
    organizationId: MARKETING_BAT_ORG_ID,
    marketingPermissions: [],
  },
  otherOrg: {
    userId: "user-bat-other-org",
    role: "SUPER_ADMIN",
    organizationId: MARKETING_BAT_OTHER_ORG_ID,
    marketingPermissions: [],
  },
} as const;

type FixtureRow = Record<(typeof MARKETING_BAT_HEADERS)[number], string>;

function pad(n: number): string {
  return String(n).padStart(3, "0");
}

function eligibleRow(index: number, overrides: Partial<FixtureRow> = {}): FixtureRow {
  const n = pad(index);
  return {
    "External Key": `BAT-HL-${n}`,
    "Full Name": `Fixture Person ${n}`,
    "First Name": `Person${n}`,
    Email: `eligible.${n}@${MARKETING_BAT_DOMAIN}`,
    Mobile: `90000${pad(index)}`.slice(0, 10),
    Location: "Pune",
    "Product Interest": "Home Loan",
    Consent: "yes",
    ...overrides,
  };
}

function smallTab(id: string, title: string, product: string, count: number) {
  const rows = Array.from({ length: count }, (_, i) =>
    eligibleRow(i + 1, {
      "External Key": `BAT-${id.toUpperCase()}-${pad(i + 1)}`,
      Email: `${id}.${pad(i + 1)}@${MARKETING_BAT_DOMAIN}`,
      "Product Interest": product,
    }),
  );
  return { id, title, headers: [...MARKETING_BAT_HEADERS], rows };
}

export function buildMarketingBatControlledRows(): {
  eligible: FixtureRow[];
  invalidEmail: FixtureRow;
  duplicateEmail: FixtureRow;
  missingName: FixtureRow;
  missingMobile: FixtureRow;
  suppressed: FixtureRow;
  unsubscribed: FixtureRow;
  hardBounced: FixtureRow;
  filteredOut: FixtureRow;
  previouslyContacted: FixtureRow;
  missingPersonalisation: FixtureRow;
} {
  const missingMobile = eligibleRow(2, { Mobile: "" });
  const missingPersonalisation = eligibleRow(3, { "First Name": "" });
  const missingName = eligibleRow(4, { "Full Name": "", "First Name": "KeyOnly" });
  const eligible = [
    eligibleRow(1),
    missingMobile,
    missingPersonalisation,
    missingName,
    ...Array.from({ length: MARKETING_BAT_ELIGIBLE_COUNT - 4 }, (_, i) => eligibleRow(i + 5)),
  ];
  return {
    eligible,
    invalidEmail: eligibleRow(900, {
      "External Key": "BAT-HL-INVALID",
      Email: "not-an-email",
      "Full Name": "Invalid Address Fixture",
    }),
    duplicateEmail: eligibleRow(901, {
      "External Key": "BAT-HL-DUP",
      Email: `eligible.001@${MARKETING_BAT_DOMAIN}`,
      "Full Name": "Duplicate Email Fixture",
    }),
    missingName,
    missingMobile,
    suppressed: eligibleRow(902, {
      "External Key": "BAT-HL-SUP",
      Email: `suppressed.bat@${MARKETING_BAT_DOMAIN}`,
      "Full Name": "Suppressed Fixture",
    }),
    unsubscribed: eligibleRow(903, {
      "External Key": "BAT-HL-UNSUB",
      Email: `unsubscribed.bat@${MARKETING_BAT_DOMAIN}`,
      "Full Name": "Unsubscribed Fixture",
    }),
    hardBounced: eligibleRow(904, {
      "External Key": "BAT-HL-BOUNCE",
      Email: `hardbounce.bat@${MARKETING_BAT_DOMAIN}`,
      "Full Name": "Hard Bounce Fixture",
    }),
    filteredOut: eligibleRow(905, {
      "External Key": "BAT-HL-FILTER",
      Email: `filtered.bat@${MARKETING_BAT_DOMAIN}`,
      Location: "FILTERED-OUT-CITY",
      "Full Name": "Filtered Out Fixture",
    }),
    previouslyContacted: eligibleRow(906, {
      "External Key": "BAT-HL-PREV",
      Email: `previous.bat@${MARKETING_BAT_DOMAIN}`,
      "Full Name": "Previously Contacted Fixture",
    }),
    missingPersonalisation,
  };
}

export function buildMarketingBatPostSnapshotRows(): {
  edited: FixtureRow;
  added: FixtureRow;
} {
  return {
    edited: eligibleRow(1, {
      "Full Name": "Edited After Snapshot Fixture",
      Email: `edited.after.snapshot@${MARKETING_BAT_DOMAIN}`,
    }),
    added: eligibleRow(999, {
      "External Key": "BAT-HL-ADDED",
      Email: `added.after.snapshot@${MARKETING_BAT_DOMAIN}`,
      "Full Name": "Added After Snapshot Fixture",
    }),
  };
}

export function buildMarketingBatHomeLoanRows(): FixtureRow[] {
  const controlled = buildMarketingBatControlledRows();
  return [
    ...controlled.eligible,
    controlled.invalidEmail,
    controlled.duplicateEmail,
    controlled.suppressed,
    controlled.unsubscribed,
    controlled.hardBounced,
    controlled.filteredOut,
    controlled.previouslyContacted,
  ];
}

export function buildMarketingBatWorkbookTabs() {
  return [
    {
      id: MARKETING_BAT_HOME_LOAN_TAB_ID,
      title: "Home Loan",
      headers: [...MARKETING_BAT_HEADERS],
      rows: buildMarketingBatHomeLoanRows(),
    },
    smallTab("tab_home_loan_bt", "Home Loan Balance Transfer", "Home Loan Balance Transfer", 8),
    smallTab("tab_working_capital", "Working Capital", "Working Capital", 8),
    smallTab("tab_unsecured_bl", "Unsecured Business Loan", "Unsecured Business Loan", 8),
    smallTab("tab_general", "General Database", "General", 12),
  ];
}

export const MARKETING_BAT_EXPECTED_ELIGIBILITY = {
  eligible: MARKETING_BAT_ELIGIBLE_COUNT,
  invalidEmails: 1,
  duplicates: 1,
  suppressed: 3,
  excludedByFilter: 1,
  previouslyContacted: 1,
} as const;

export function marketingBatSuppressedEmails(): string[] {
  const c = buildMarketingBatControlledRows();
  return [
    c.suppressed.Email.toLowerCase(),
    c.unsubscribed.Email.toLowerCase(),
    c.hardBounced.Email.toLowerCase(),
  ];
}
