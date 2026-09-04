import { COMPANY_STATISTICS } from "@/config/company-facts";
import { cn } from "@/lib/utils";

export function CompanyStatisticsMeter({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {COMPANY_STATISTICS.map((stat) => (
        <article
          key={stat.id}
          className="rounded-2xl border border-primary/15 bg-white/[0.04] px-5 py-7 text-center shadow-[0_0_40px_-18px_var(--glow)] backdrop-blur"
        >
          <p className="text-2xl font-bold tracking-tight text-gradient sm:text-3xl">
            {stat.value}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
        </article>
      ))}
    </div>
  );
}
