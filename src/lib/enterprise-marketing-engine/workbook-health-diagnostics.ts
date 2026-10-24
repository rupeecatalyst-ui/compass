/**
 * Health diagnostics for authorised Google Sheets workbooks.
 * Registry membership is the authorisation signal — not equality with the
 * environment-default spreadsheet ID.
 */

export type MarketingWorkbookHealthContext = {
  authorisedInOrganisationRegistry: boolean;
  isEnvironmentDefaultWorkbook: boolean;
};

export function describeMarketingWorkbookHealthContext(input: {
  bindingSpreadsheetId?: string | null;
  environmentWorkbookId?: string | null;
  registryAuthorised: boolean;
}): MarketingWorkbookHealthContext {
  const sheet = (input.bindingSpreadsheetId ?? "").trim();
  const env = (input.environmentWorkbookId ?? "").trim();
  return {
    authorisedInOrganisationRegistry: Boolean(input.registryAuthorised),
    isEnvironmentDefaultWorkbook: Boolean(env) && Boolean(sheet) && env === sheet,
  };
}
