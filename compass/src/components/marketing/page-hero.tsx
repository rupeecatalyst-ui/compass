import { cn } from "@/lib/utils";

interface PageHeroProps {
  eyebrow?: string;
  headline: string;
  subheadline?: string;
  className?: string;
  align?: "left" | "center";
  children?: React.ReactNode;
}

export function PageHero({
  eyebrow,
  headline,
  subheadline,
  className,
  align = "center",
  children,
}: PageHeroProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden pt-10 sm:pt-14 lg:pt-16 pb-6 sm:pb-8",
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
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-[2rem] font-bold tracking-tight leading-[1.15] sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
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
        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </div>
  );
}
