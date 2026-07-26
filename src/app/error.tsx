"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";

/**
 * Segment error boundary — recovery UI for internal dry runs.
 * CO-ARCH-009 — Non-production / certification builds surface the underlying
 * exception message; production keeps the friendly screen and logs details.
 */
function shouldSurfaceErrorDetails(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.NEXT_PUBLIC_CERTIFICATION_ERROR_DETAILS === "true";
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const showDetails = shouldSurfaceErrorDetails();

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
      {showDetails && error?.message ? (
        <pre className="max-w-xl overflow-x-auto rounded-md border border-border bg-muted/40 px-3 py-2 text-left text-xs text-destructive whitespace-pre-wrap break-words">
          {error.message}
          {error.digest ? `\nDigest: ${error.digest}` : ""}
        </pre>
      ) : null}
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
