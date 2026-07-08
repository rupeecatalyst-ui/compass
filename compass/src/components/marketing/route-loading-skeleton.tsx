export function RouteLoadingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading page</span>
      <div className="mx-auto max-w-2xl space-y-4 text-center">
        <div className="mx-auto h-7 w-28 animate-pulse rounded-full bg-white/5" />
        <div className="mx-auto h-10 w-3/4 max-w-md animate-pulse rounded-xl bg-white/8" />
        <div className="mx-auto h-4 w-full max-w-sm animate-pulse rounded-lg bg-white/5" />
        <div className="mx-auto h-4 w-5/6 max-w-xs animate-pulse rounded-lg bg-white/5" />
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-44 animate-pulse rounded-2xl border border-border/40 bg-white/[0.03]"
            style={{ animationDelay: `${index * 80}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
