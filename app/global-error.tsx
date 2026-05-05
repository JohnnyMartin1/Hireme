"use client";

import { useEffect } from "react";

/**
 * Root-level error UI when the root layout fails. Must define html and body
 * (Next.js requirement). Minimal markup so this file stays resilient.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    let cancelled = false;
    void import("@sentry/nextjs").then((Sentry) => {
      if (!cancelled) Sentry.captureException(error);
    });
    return () => {
      cancelled = true;
    };
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f8fafc", color: "#0f172a" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "1.5rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ fontSize: "0.875rem", color: "#475569", maxWidth: "28rem" }}>
            {error.message || "The app hit a critical error. You can try reloading the page."}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              borderRadius: "0.5rem",
              border: "none",
              background: "#0b1f4b",
              color: "#fff",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 600,
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
