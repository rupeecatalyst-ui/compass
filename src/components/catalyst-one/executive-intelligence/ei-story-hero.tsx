"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from "lucide-react";
import type { EiPulseMetric } from "@/types/executive-intelligence-platform";
import { cn } from "@/lib/utils";

export function EiStoryHero({
  headline,
  subline,
  pulse,
}: {
  headline: string;
  subline: string;
  pulse: EiPulseMetric[];
}) {
  return (
    <section className="ei-hero">
      <div className="relative z-[1] px-6 py-8 sm:px-10 sm:py-10">
        <p className="ei-eyebrow text-teal-300/95">Catalyst One · Executive Intelligence</p>
        <h1 className="ei-display mt-3 max-w-3xl text-[2rem] leading-[1.12] text-white sm:text-[2.75rem]">
          {headline}
        </h1>
        <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-slate-300/95">
          {subline}
        </p>

        <div className="ei-stagger mt-8 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {pulse.map((m) => (
            <PulseCard key={m.id} metric={m} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PulseCard({ metric }: { metric: EiPulseMetric }) {
  const Icon =
    metric.deltaTone === "up"
      ? ArrowUpRight
      : metric.deltaTone === "down"
        ? ArrowDownRight
        : Minus;
  const body = (
    <div className="ei-pulse group p-4">
      <p className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {metric.label}
      </p>
      <p className="ei-display mt-2 text-[1.75rem] tabular-nums leading-none tracking-tight text-white">
        {metric.value}
      </p>
      <div className="mt-2.5 flex items-center gap-1.5 text-[0.6875rem] text-slate-300">
        <Icon
          className={cn(
            "h-3.5 w-3.5 transition-colors duration-300",
            metric.deltaTone === "up" && "text-emerald-400",
            metric.deltaTone === "down" && "text-rose-400",
          )}
        />
        <span>{metric.deltaLabel}</span>
      </div>
      <p className="mt-3 line-clamp-2 text-[0.6875rem] leading-snug text-slate-400">
        {metric.insight}
      </p>
      {metric.href ? (
        <span className="mt-3 inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-teal-300 opacity-0 transition duration-300 group-hover:opacity-100">
          Explore <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
        </span>
      ) : null}
    </div>
  );
  return metric.href ? (
    <Link href={metric.href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}
