import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { IntelligenceBadge } from "@/components/coaching/intelligence-badge";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

interface ComingSoonPanelProps {
  title?: string;
  description?: string;
  ctaHref?: string;
  ctaLabel?: string;
}

export function ComingSoonPanel({
  title = "Coming Soon",
  description = "This experience is being prepared. Explore related coaches or speak with our team — no calculations run here yet.",
  ctaHref = ROUTES.CONTACT,
  ctaLabel = "Talk to us",
}: ComingSoonPanelProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/60 glass-panel p-6 sm:p-10">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-border/70 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {title}
          </span>
          <IntelligenceBadge compact />
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href={ctaHref}>
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" className="bg-transparent" asChild>
            <Link href={ROUTES.COACHES}>Browse Coaches</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
