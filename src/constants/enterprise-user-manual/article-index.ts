/**
 * CO-C1-ADMIN-USER-MANUAL-001 — Article index (paths only).
 * Bodies remain in Markdown under content/enterprise-user-manual/.
 * Add a row here when adding a new article file.
 */

import type { UserManualCategoryId } from "@/types/enterprise-user-manual";

export type UserManualArticleIndexEntry = {
  slug: string;
  categoryId: UserManualCategoryId;
  file: string;
};

/**
 * Canonical article registry. Keep `file` aligned with the Markdown path.
 * Sort within category by array order.
 */
export const USER_MANUAL_ARTICLE_INDEX: readonly UserManualArticleIndexEntry[] = [
  { slug: "getting-started/overview", categoryId: "getting-started", file: "getting-started/overview.md" },
  { slug: "contacts/contact-360", categoryId: "contacts", file: "contacts/contact-360.md" },
  { slug: "opportunities/overview", categoryId: "opportunities", file: "opportunities/overview.md" },
  { slug: "deals/overview", categoryId: "deals", file: "deals/overview.md" },
  { slug: "lenders/lender-360", categoryId: "lenders", file: "lenders/lender-360.md" },
  { slug: "products/programs", categoryId: "products", file: "products/programs.md" },
  { slug: "policies/overview", categoryId: "policies", file: "policies/overview.md" },
  { slug: "communication/send-email", categoryId: "communication", file: "communication/send-email.md" },
  { slug: "marketing/overview", categoryId: "marketing", file: "marketing/overview.md" },
  {
    slug: "marketing/data-sources-audiences",
    categoryId: "marketing",
    file: "marketing/data-sources-audiences.md",
  },
  {
    slug: "marketing/campaigns-content-assets",
    categoryId: "marketing",
    file: "marketing/campaigns-content-assets.md",
  },
  {
    slug: "marketing/execution-safety",
    categoryId: "marketing",
    file: "marketing/execution-safety.md",
  },
  {
    slug: "marketing/engagement-qualification-handoff",
    categoryId: "marketing",
    file: "marketing/engagement-qualification-handoff.md",
  },
  {
    slug: "marketing/troubleshooting",
    categoryId: "marketing",
    file: "marketing/troubleshooting.md",
  },
  {
    slug: "administration/console",
    categoryId: "administration",
    file: "administration/console.md",
  },
];

export const USER_MANUAL_DEFAULT_SLUG = "getting-started/overview";
