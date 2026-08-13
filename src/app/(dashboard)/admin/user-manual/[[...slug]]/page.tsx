import { notFound } from "next/navigation";
import { UserManualWorkspace } from "@/components/catalyst-one/enterprise-user-manual";
import {
  getRelatedArticles,
  getUserManualArticle,
  listRecentlyUpdated,
  listUserManualCatalog,
  resolveUserManualSlug,
} from "@/lib/enterprise-user-manual";
import { USER_MANUAL_ARTICLE_INDEX } from "@/constants/enterprise-user-manual";

interface UserManualPageProps {
  params: Promise<{ slug?: string[] }>;
}

export default async function AdminUserManualPage({ params }: UserManualPageProps) {
  const { slug: slugParts } = await params;
  const slug = resolveUserManualSlug(slugParts);
  const catalog = listUserManualCatalog();
  const article = getUserManualArticle(slug);
  if (!article) notFound();

  const related = getRelatedArticles(article, catalog);
  const recent = listRecentlyUpdated(catalog, 6);

  const orderedSlugs = USER_MANUAL_ARTICLE_INDEX.map((e) => e.slug).filter((s) =>
    catalog.articles.some((a) => a.slug === s),
  );
  const idx = orderedSlugs.indexOf(article.slug);
  const prevMeta =
    idx > 0 ? catalog.articles.find((a) => a.slug === orderedSlugs[idx - 1]) ?? null : null;
  const nextMeta =
    idx >= 0 && idx < orderedSlugs.length - 1
      ? catalog.articles.find((a) => a.slug === orderedSlugs[idx + 1]) ?? null
      : null;

  return (
    <UserManualWorkspace
      catalog={catalog}
      article={article}
      related={related}
      recent={recent}
      prev={prevMeta}
      next={nextMeta}
    />
  );
}
