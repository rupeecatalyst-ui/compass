# CO-MARKETING-GOOGLE-ACTIVATION-001

Status: **Implementation complete · Marketing module only**  
Hostinger: **UNCHANGED** · Push: **not performed**  
Execution: `ENTERPRISE_MARKETING_EXECUTION_ENABLED=false` · Email: `dry_run`

## Scope correction

Google Workbook activation is a Marketing capability. It was **not** implemented in
`.tmp/wt-product-program-operations`. That worktree remains frozen at
`212672fdbfa58867c9b1cd63d900f245ce56f0fa`.

| Check | Result |
|---|---|
| Google/Marketing commits in Product Programme worktree | **None** |
| Uncommitted Google/Marketing source in that worktree | **None** (leftover `node_modules.partial-npm/` only) |
| Certified Product Programme commits amended | **No** |

This worktree:

- Path: `C:\Compass by Rupee Catalyst (3)\.tmp\wt-marketing-google-activation`
- Branch: `co-marketing-google-activation-001`
- Base SHA: `212672fdbfa58867c9b1cd63d900f245ce56f0fa`

## Root cause — empty Authorised Workbook dropdown

Campaign Builder loaded `/api/admin/marketing/data-sources` and rendered `bindings`.

`listBindings()` returned `[]` when Sheets resolved **NOT_CONFIGURED**, which happens when:

1. `ENTERPRISE_PERSISTENCE_MODE=prisma` and fixture mode is not explicitly allowed
2. Live mode has no server-side Google credentials
3. Bindings lived only in an in-memory store, not `enterprise_marketing_sheet_bindings`

The Audience step also swallowed a non-OK source response and showed an empty Select with no Configuration Required banner.

## What changed

Administrators register organisation-authorised workbooks (specific spreadsheet IDs, never Drive browsing). Campaign operators select only **active** authorised workbooks for their organisation.

Workflow: Authorised Workbook → Worksheet Tab → Column Mapping (email mandatory, explicit confirm) → Filters and Exclusions → Eligibility Preview → Frozen Audience Snapshot.

Selecting, mapping, previewing or snapshotting Google rows does **not** create Contacts, Leads or Opportunities.

## Google configuration (administrator)

Live read-only Sheets was **not** exercised in this environment (credentials absent).

1. Create a Google Cloud service account with Sheets API enabled.
2. Share each permitted spreadsheet with the service account as **Viewer**.
3. Set server-only env (never `NEXT_PUBLIC_*`, never commit secrets):
   - `GOOGLE_SHEETS_CLIENT_EMAIL`
   - `GOOGLE_SHEETS_PRIVATE_KEY` (PEM, `\n` escaped)
   - `ENTERPRISE_MARKETING_SHEETS_MODE=live`
4. Keep `ENTERPRISE_MARKETING_EXECUTION_ENABLED=false` and `ENTERPRISE_MARKETING_EMAIL_MODE=dry_run`.
5. In Marketing → Data Sources, paste the spreadsheet ID and **Bind authorised workbook**.
6. Campaign Builder Audience step should show **Connected** and the authorised workbook.

## Safety

- Hostinger unchanged
- No push
- Email execution disabled
- Pilot not authorised
