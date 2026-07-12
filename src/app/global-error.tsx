"use client";

import { useEffect } from "react";

/**
 * Root error boundary — used when the root layout fails.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
