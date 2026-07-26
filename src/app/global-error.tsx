"use client";

import { useEffect } from "react";

function shouldSurfaceErrorDetails(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.NEXT_PUBLIC_CERTIFICATION_ERROR_DETAILS === "true";
}

/**
 * Root error boundary — used when the root layout fails.
 * CO-ARCH-009 — Surface underlying message in development / certification builds.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const showDetails = shouldSurfaceErrorDetails();

  useEffect(() => {
    console.error("[Catalyst One] global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased">
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "1.5rem",
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Catalyst One unavailable</h1>
          <p style={{ maxWidth: "28rem", color: "#666", fontSize: "0.875rem" }}>
            A critical error prevented the application shell from loading.
          </p>
          {showDetails && error?.message ? (
            <pre
              style={{
                maxWidth: "36rem",
                overflow: "auto",
                border: "1px solid #e4e4e7",
                borderRadius: "0.375rem",
                background: "#fafafa",
                padding: "0.75rem",
                fontSize: "0.75rem",
                color: "#b91c1c",
                textAlign: "left",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {error.message}
              {error.digest ? `\nDigest: ${error.digest}` : ""}
            </pre>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              height: "2.25rem",
              borderRadius: "0.375rem",
              background: "#18181b",
              color: "#fafafa",
              padding: "0 1rem",
              fontSize: "0.875rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
