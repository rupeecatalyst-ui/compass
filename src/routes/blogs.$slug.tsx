import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { blogBySlug, BLOG_POSTS, type BlogPost } from "@/lib/blog";

export const Route = createFileRoute("/blogs/$slug")({
  head: ({ params }) => {
    const p = blogBySlug(params.slug);
    if (!p) return { meta: [{ title: "Article | Rupee Catalyst" }] };
    return {
      meta: [
        { title: `${p.title} | Rupee Catalyst` },
        { name: "description", content: p.excerpt },
        { property: "og:title", content: p.title },
        { property: "og:description", content: p.excerpt },
        { property: "og:url", content: `/blogs/${p.slug}` },
        { property: "og:type", content: "article" },
      ],
      links: [{ rel: "canonical", href: `/blogs/${p.slug}` }],
    };
  },
  loader: ({ params }) => {
    const post = blogBySlug(params.slug);
    if (!post) throw notFound();
    return { post };
  },
  notFoundComponent: () => (
    <div className="container mx-auto px-4 py-24 text-center">
      <h1 className="font-display text-3xl font-bold text-navy">Article not found</h1>
      <Button asChild variant="cta" className="mt-6"><Link to="/blogs">Back to all articles</Link></Button>
    </div>
  ),
  component: BlogPostPage,
});

function BlogPostPage() {
  const { post } = Route.useLoaderData() as { post: BlogPost };
  const related = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <>
      <section className="bg-gradient-hero py-14 md:py-20 text-navy-foreground">
        <div className="container mx-auto max-w-3xl px-4">
          <Link to="/blogs" className="inline-flex items-center gap-1.5 text-sm text-navy-foreground/80 hover:text-cta">
            <ArrowLeft className="size-4" /> Back to Knowledge Centre
          </Link>
          <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-cta">
            {post.category} · {post.read} read
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight md:text-5xl">{post.title}</h1>
          <p className="mt-4 text-base text-navy-foreground/85 md:text-lg">{post.excerpt}</p>
        </div>
      </section>

      <article className="py-12 md:py-16">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="mb-8 overflow-hidden rounded-2xl shadow-elevated">
            <img src={post.cover} alt={post.title} loading="eager" fetchPriority="high" decoding="async" className="w-full aspect-[16/9] object-cover" />
          </div>
          <div className="space-y-5">
            {post.content.map((para, i) => (
              <p key={i} className="text-base leading-relaxed text-foreground/85">
                {para}
              </p>
            ))}
          </div>
          <div className="mt-10 rounded-2xl bg-gradient-trust p-6 text-navy-foreground shadow-elevated md:p-8">
            <h3 className="font-display text-xl font-extrabold md:text-2xl">Need expert help on this?</h3>
            <p className="mt-2 text-sm text-navy-foreground/85">
              Our team helps thousands of Indians choose the right loan & investment every month — free and unbiased.
            </p>
            <Button asChild variant="cta" size="lg" className="mt-5">
              <Link to="/contact">Talk to an Expert <ArrowRight className="size-4" /></Link>
            </Button>
          </div>
        </div>
      </article>

      <section className="bg-surface py-14">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-2xl font-extrabold text-navy">Continue reading</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {related.map((p) => (
              <Card key={p.slug} className="group overflow-hidden p-0 shadow-card hover:shadow-elevated transition-shadow">
                <Link to="/blogs/$slug" params={{ slug: p.slug }} className="block aspect-[16/9] overflow-hidden bg-surface">
                  <img src={p.cover} alt={p.title} loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </Link>
                <div className="p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-cta">{p.category} · {p.read}</p>
                  <h3 className="mt-2 font-display text-base font-bold text-navy group-hover:text-royal transition-colors">{p.title}</h3>
                  <Link to="/blogs/$slug" params={{ slug: p.slug }} className="mt-3 inline-block text-sm font-semibold text-royal hover:underline">
                    Read more →
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
