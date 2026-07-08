import { cn } from "@/lib/utils";

interface PageHeroProps {
  eyebrow?: string;
  headline: string;
  subheadline?: string;
  className?: string;
  align?: "left" | "center";
}

export function PageHero({
  eyebrow,
  headline,
  subheadline,
  className,
  align = "center",
}: PageHeroProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden pt-10 sm:pt-14 lg:pt-16 pb-4",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 ambient-glow opacity-80" />
      <div className="pointer-events-none absolute inset-0 grid-fade opacity-30" />
      <div
        className={cn(
          "relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8",
          align === "center" ? "text-center" : "text-left",
        )}
      >
        {eyebrow ? (
          <p className="mb-4 inline-flex rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
          {headline}
        </h1>
        {subheadline ? (
          <p
            className={cn(
              "mt-5 text-base text-muted-foreground leading-relaxed sm:text-lg",
              align === "center" ? "mx-auto max-w-2xl" : "max-w-2xl",
            )}
          >
            {subheadline}
          </p>
        ) : null}
      </div>
    </div>
  );
}
