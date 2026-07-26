#!/usr/bin/env bash
# CO-REL-001 — milestone commits for RC-1 (hygiene sprint; no product edits beyond staging).
set -euo pipefail

commit_if_staged() {
  local title="$1"
  local body="$2"
  if git diff --cached --quiet; then
    echo "SKIP (empty): $title"
    git reset -q
    return 0
  fi
  git commit -m "$(cat <<EOF
${title}

${body}
EOF
)"
  echo "OK: $title"
}

echo "== CO-REL-001 milestone commits =="

# 1) Deal Registry
git add \
  prisma/migrations/*co_arch_002* \
  prisma/migrations/*enterprise_deal* \
  server/repositories/enterprise-deal \
  server/services/enterprise-deal \
  src/lib/enterprise-deal \
  src/app/api/enterprise-deals \
  src/types/enterprise-deal.ts \
  src/types/deal-pipeline-runtime.ts \
  src/constants/enterprise-deal-registry \
  src/constants/enterprise-deal-journey-progress.ts \
  src/constants/deal-workspace-layout.ts \
  src/components/catalyst-one/deal-workspace \
  src/components/catalyst-one/architecture/deal-cutover-health-panel.tsx \
  src/components/catalyst-one/action-center/deal-action-center.tsx \
  "src/app/(dashboard)/deals" \
  src/lib/deal-workspace \
  docs/co-arch-002 \
  scripts/co-arch-002* \
  .cursor/rules/deal-centric-enterprise.mdc \
  docs/architecture/FOUNDATION-PRINCIPLE-DEAL-CENTRIC.md \
  docs/adr/ADR-016-enterprise-deal-transactional-ssot.md \
  docs/adr/ADR-019-co-arch-004-deal-workspace-identity.md \
  docs/adr/ADR-020-enterprise-deal-one-lender-one-deal.md \
  2>/dev/null || true
git add -u -- src/lib/enterprise-deal src/lib/strategic-lender-pipeline 2>/dev/null || true
commit_if_staged \
  "feat(arch): add Enterprise Deal Registry foundation (CO-ARCH-002)" \
  "Land durable deal identity, DAL consumers, APIs, workspace host, and cutover controls for RC-1."

# 2) Master registries
git add \
  prisma/migrations/*co_arch_001* \
  prisma/migrations/*product_registry* \
  prisma/migrations/*document_registry* \
  prisma/migrations/*lender_registry* \
  prisma/migrations/*go_live_p0* \
  prisma/migrations/*co_arch_004* \
  server/repositories/document-registry \
  server/repositories/lender-registry \
  server/repositories/product-registry \
  server/services/document-registry \
  server/services/lender-registry \
  server/services/product-registry \
  server/services/reference-master \
  server/services/tier2-registry \
  src/app/api/document-registry \
  src/app/api/lender-registry \
  src/app/api/product-registry \
  "src/app/(dashboard)/admin/lender-registry" \
  "src/app/(dashboard)/admin/reference-masters" \
  src/components/catalyst-one/lender-registry-admin \
  src/components/catalyst-one/reference-master-admin \
  src/lib/enterprise-lender-registry \
  src/lib/enterprise-master-data \
  src/lib/enterprise-tier2-ports \
  src/constants/enterprise-lender-registry \
  src/constants/enterprise-master-data \
  src/types/enterprise-document-registry.ts \
  src/types/enterprise-lender-registry.ts \
  src/types/enterprise-product-registry.ts \
  src/types/reference-master-port.ts \
  src/types/tier2-registry-port.ts \
  docs/co-arch-001 \
  scripts/co-arch-001* \
  scripts/co-arch-004* \
  scripts/co-arch-005* \
  scripts/go-live-p0* \
  2>/dev/null || true
commit_if_staged \
  "feat(arch): add Tier-1 and Tier-2 enterprise master registries" \
  "Add reference, product, document, and lender registry infrastructure with admin surfaces (CO-ARCH-001/004/005)."

# 3) Opportunity registry
git add \
  src/app/api/enterprise-opportunities \
  src/constants/enterprise-opportunity-registry \
  src/lib/enterprise-opportunity \
  docs/adr/ADR-017-business-data-provenance-cad-2026-001.md \
  scripts/co-arch-003* \
  2>/dev/null || true
commit_if_staged \
  "feat(arch): add Enterprise Opportunity Registry consumers (CO-ARCH-003)" \
  "Wire opportunity registry APIs and client sync helpers into the enterprise ownership model."

# 4) Ops / Gov / Cert / Stab
git add \
  src/lib/ops \
  src/lib/enterprise-governance \
  src/types/ops-observability.ts \
  src/types/enterprise-governance.ts \
  src/app/api/admin/ops-health \
  src/app/api/admin/governance \
  src/lib/enterprise-persistence \
  scripts/co-ops-002* \
  scripts/co-gov-001* \
  scripts/co-cert-* \
  docs/ops \
  docs/security \
  .cursor/rules/enterprise-task-engine.mdc \
  2>/dev/null || true
# stab/cert docs may already be under docs/security
commit_if_staged \
  "feat(platform): add ops observability, governance, and certification toolkit" \
  "Ship CO-OPS-002, CO-GOV-001, CO-CERT-005, and related integrity/security hardening for RC-1."

# 5) Business capabilities ETE / EBI / ECE
git add \
  src/lib/enterprise-task-engine \
  src/constants/enterprise-task-engine \
  src/components/catalyst-one/tasks/entity-tasks-panel.tsx \
  src/components/catalyst-one/tasks/my-work-panel.tsx \
  src/components/catalyst-one/tasks/task-reports-panel.tsx \
  src/lib/enterprise-business-intelligence \
  src/types/enterprise-business-intelligence.ts \
  src/app/api/admin/business-intelligence \
  docs/co-biz-003 \
  scripts/co-biz-003* \
  .cursor/rules/enterprise-business-intelligence.mdc \
  src/lib/enterprise-customer-engagement \
  src/types/enterprise-customer-engagement.ts \
  src/constants/enterprise-customer-engagement \
  src/components/catalyst-one/customer-engagement-portal \
  src/app/customer-engagement \
  docs/co-biz-004 \
  scripts/co-biz-004* \
  .cursor/rules/enterprise-customer-engagement.mdc \
  2>/dev/null || true
git add -u -- \
  src/lib/enterprise-task-engine \
  src/components/catalyst-one/tasks \
  src/components/catalyst-one/customer-document-portal \
  src/components/catalyst-one/opportunity-workspace/workspace-document-requests-panel.tsx \
  src/app/\(mission-control\)/mission-control/executive-briefing \
  2>/dev/null || true
commit_if_staged \
  "feat(biz): add ETE work management, EBI, and customer engagement" \
  "Deliver CO-BIZ-001/003/004 as projection layers over Deal, tasks, documents, and EDC — no parallel ownership models."

# 6) Navigation / Loan Board retirement / My Deals
git add -u -- \
  src/components/catalyst-one/loan-board \
  src/components/catalyst-one/loan-files \
  src/hooks/use-loan-board.ts \
  src/components/catalyst-one/dashboard \
  src/config/navigation.ts \
  src/components/layout \
  src/components/providers/sidebar-provider.tsx \
  .cursor/rules/navigation-architecture.mdc \
  .cursor/rules/my-deals-work-queue.mdc \
  .cursor/rules/enterprise-business-journey-navigator.mdc \
  2>/dev/null || true
git add \
  "src/app/(dashboard)/my-opportunities" \
  src/components/catalyst-one/my-opportunities \
  src/components/catalyst-one/my-deals \
  src/components/catalyst-one/user-home-dashboard \
  src/components/enterprise/navigation \
  src/constants/my-opportunities.ts \
  src/constants/my-workspace.ts \
  src/constants/sidebar-navigation.ts \
  src/constants/user-home-dashboard.ts \
  src/constants/user-home-dashboard \
  src/lib/my-deals \
  src/lib/my-opportunities \
  src/lib/user-home-dashboard \
  src/types/user-home-new-arrivals.ts \
  src/lib/enterprise-session \
  2>/dev/null || true
commit_if_staged \
  "feat(ux): retire Loan Board and align My Deals journey navigation" \
  "Remove Loan Board surfaces and stabilize My Deals / My Opportunities / user-home navigation for the enterprise work queue."

# 7) Auth / org onboarding
git add \
  "src/app/(auth)/accept-invitation" \
  "src/app/(auth)/create-organization" \
  src/components/auth \
  src/styles/auth-experience.css \
  src/app/api/auth \
  server/services/organization-onboarding.service.ts \
  docs/certification-screenshots/co-sprint-118-auth \
  2>/dev/null || true
git add -u -- \
  "src/app/(auth)" \
  src/components/auth \
  server/services/auth.service.ts \
  server/validators/auth.validators.ts \
  2>/dev/null || true
commit_if_staged \
  "feat(auth): add organization onboarding and auth experience" \
  "Add invitation accept, organization registration, and improved password UX without changing frozen certification identity policy."

# 8) Remaining workspace / commercial / journey
git add \
  "src/app/(dashboard)/lead-information" \
  "src/app/(dashboard)/loan-information" \
  "src/app/(dashboard)/loan-journey" \
  "src/app/(dashboard)/accounting" \
  "src/app/(dashboard)/admin/build-information" \
  src/app/api/accounting-payees \
  src/app/api/invoice-parties \
  src/app/api/admin/build-information \
  src/components/catalyst-one/accounting \
  src/components/catalyst-one/loan-journey \
  src/components/catalyst-one/lead-information \
  src/components/catalyst-one/platform \
  src/components/catalyst-one/enterprise-relationship-workspace \
  src/components/catalyst-one/chanakya-loading \
  src/lib/accounting-payee \
  src/lib/accounting-workspace \
  src/lib/invoice-party \
  src/lib/loan-payee \
  src/lib/loan-commercial-payee \
  src/lib/loan-journey \
  src/lib/loan-structure \
  src/lib/lead-information \
  src/lib/build-information \
  src/lib/chanakya-loading \
  src/lib/enterprise-relationship-workspace \
  src/lib/strategic-competition \
  src/lib/lender-pipeline \
  src/lib/document-center \
  src/constants/accounting-workbench.ts \
  src/constants/invoice-party.ts \
  src/constants/loan-commercial-payee.ts \
  src/constants/loan-structure \
  src/constants/lead-information-workspace.ts \
  src/constants/build-information \
  src/constants/chanakya-loading \
  src/constants/canonical-journey-header.ts \
  src/constants/enterprise-exit-navigation.ts \
  src/constants/opportunity-active-uniqueness.ts \
  src/constants/opportunity-lifecycle.ts \
  src/constants/opportunity-workspace-stages.ts \
  src/constants/enterprise-relationship-workspace \
  src/constants/enterprise-search-autocomplete.ts \
  src/types/build-information.ts \
  src/types/chanakya-loading.ts \
  src/types/enterprise-relationship-workspace.ts \
  docs/adr/ADR-018-start-loan-journey-draft-lead-information.md \
  2>/dev/null || true
git add -u -- \
  src/components/catalyst-one/opportunity-workspace \
  src/components/catalyst-one/shared \
  src/components/catalyst-one/document-center \
  src/components/catalyst-one/enterprise-credit-workspace \
  src/components/catalyst-one/credit-bench \
  src/components/catalyst-one/execution \
  src/components/catalyst-one/contacts \
  src/components/catalyst-one/companies \
  src/components/catalyst-one/contact-strategy \
  src/lib/lead-opportunity-journey \
  src/hooks \
  2>/dev/null || true
commit_if_staged \
  "feat(workspace): extend journey, accounting, and document workspace surfaces" \
  "Capture remaining opportunity journey, payee/accounting, document center, and relationship workspace updates for RC-1."

# 9) Docs / PMO / screenshots / RC notes / remaining rules
git add \
  docs/co-rel-001 \
  docs/adr \
  docs/pmo \
  docs/certification-screenshots \
  docs/architecture \
  .cursor/rules \
  scripts/fixtures \
  scripts/opportunity-header* \
  2>/dev/null || true
git add -u -- docs .cursor/rules 2>/dev/null || true
commit_if_staged \
  "docs: add ADRs, PMO updates, certification evidence, and RC-1 notes" \
  "Record CO-REL-001 commit strategy, release notes, ADRs, and certification screenshots for Release Candidate 1."

# 10) Everything remaining (tooling + leftover source)
git add -A
# Ensure deleted hygiene scripts are not resurrected (already deleted, untracked)
commit_if_staged \
  "chore: sync tooling and remaining RC-1 surface" \
  "Land package scripts, env examples, Prisma schema/seed, server wiring, and any residual certified paths for v1.0.0-rc1."

echo "== status =="
git status -sb
echo "== recent commits =="
git log --oneline -15
