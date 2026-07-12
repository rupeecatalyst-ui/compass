"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";

/**
 * Segment error boundary — recovery UI for internal dry runs.
 * Does not alter business logic.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Catalyst One] route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Something went wrong
      </p>
      <h1 className="text-xl font-semibold tracking-tight">Unable to load this view</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        An unexpected error occurred. You can retry or return to the dashboard.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Try again
        </button>
        <Link
          href={ROUTES.DASHBOARD}
          className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm font-medium"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
