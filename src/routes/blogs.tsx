import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BLOG_POSTS } from "@/lib/blog";

export const Route = createFileRoute("/blogs")({
  head: () => ({
    meta: [
      { title: "Knowledge Centre — Loans & Investment Blogs | Rupee Catalyst" },
      { name: "description", content: "Read expert articles on home loans, balance transfer, business loans, mutual funds, tax-saving and personal finance from Rupee Catalyst." },
      { property: "og:title", content: "Knowledge Centre | Rupee Catalyst" },
      { property: "og:url", content: "/blogs" },
    ],
    links: [{ rel: "canonical", href: "/blogs" }],
  }),
  component: BlogsPage,
});

const CATEGORIES = ["Home Loans", "Balance Transfer", "Personal Loans", "LAP", "Business Loans", "Working Capital", "Mutual Funds"];

function BlogsPage() {
  return (
    <>
      <section className="bg-gradient-hero py-14 md:py-20 text-navy-foreground">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-4xl font-extrabold md:text-5xl">Knowledge Centre</h1>
          <p className="mx-auto mt-3 max-w-2xl text-navy-foreground/85">
            Practical, jargon-free guides on loans, investments, and personal finance.
          </p>
        </div>
      </section>
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="default" className="cursor-pointer">All</Badge>
            {CATEGORIES.map((c) => (
              <Badge key={c} variant="secondary" className="cursor-pointer">{c}</Badge>
            ))}
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {BLOG_POSTS.map((p) => (
              <Card key={p.slug} className="group overflow-hidden p-0 shadow-card hover:shadow-elevated transition-shadow">
                <Link to="/blogs/$slug" params={{ slug: p.slug }} className="block aspect-[16/9] overflow-hidden bg-surface">
                  <img src={p.cover} alt={p.title} loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </Link>
                <div className="p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-cta">{p.category} · {p.read}</p>
                  <h3 className="mt-2 font-display text-lg font-bold text-navy group-hover:text-royal transition-colors">{p.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{p.excerpt}</p>
                  <Link
                    to="/blogs/$slug"
                    params={{ slug: p.slug }}
                    className="mt-4 inline-block text-sm font-semibold text-royal hover:underline"
                  >
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
