import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { BLOG_POSTS } from "@/lib/blog";

interface Props {
  /** Optional category filter (e.g. "Balance Transfer"). Falls back to latest 3. */
  category?: string;
  /** Posts to exclude (current article slug, etc.) */
  excludeSlugs?: string[];
  limit?: number;
  heading?: string;
}

export function RelatedBlogs({ category, excludeSlugs = [], limit = 3, heading = "Related articles" }: Props) {
  let posts = BLOG_POSTS.filter((p) => !excludeSlugs.includes(p.slug));
  if (category) {
    const filtered = posts.filter((p) => p.category.toLowerCase().includes(category.toLowerCase()));
    if (filtered.length) posts = filtered.concat(posts.filter((p) => !filtered.includes(p))).slice(0, posts.length);
  }
  posts = posts.slice(0, limit);
  if (!posts.length) return null;

  return (
    <section className="bg-surface py-14 md:py-20">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-cta">
              <BookOpen className="size-3.5" /> Knowledge centre
            </p>
            <h2 className="mt-2 font-display text-2xl font-extrabold text-navy md:text-3xl">{heading}</h2>
          </div>
          <Link to="/blogs" className="inline-flex items-center gap-1.5 text-sm font-semibold text-royal hover:text-navy">
            View all <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {posts.map((p) => (
            <Card key={p.slug} className="group overflow-hidden p-0 shadow-card hover:shadow-elevated transition-all">
              <Link to="/blogs/$slug" params={{ slug: p.slug }} className="block">
                <div className="aspect-[16/10] overflow-hidden bg-secondary">
                  <img src={p.cover} alt={p.title} loading="lazy" decoding="async" className="size-full object-cover transition-transform group-hover:scale-[1.03]" />
                </div>
                <div className="p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-cta">{p.category} · {p.read}</p>
                  <h3 className="mt-2 font-display text-base font-bold text-navy line-clamp-2">{p.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{p.excerpt}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-royal group-hover:gap-2 transition-all">
                    Read article <ArrowRight className="size-3.5" />
                  </span>
                </div>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
