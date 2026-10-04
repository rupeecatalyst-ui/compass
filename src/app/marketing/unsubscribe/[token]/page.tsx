"use client";

/**
 * CO-MARKETING-LIVE-EMAIL-FOUNDATION-001 — Public marketing unsubscribe page.
 * No authentication. No recipient email on the page. Invalid tokens fail generically.
 */

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  MARKETING_UNSUBSCRIBE_ALREADY_COPY,
  MARKETING_UNSUBSCRIBE_CONFIRM_COPY,
  MARKETING_UNSUBSCRIBE_GENERIC_INVALID,
  MARKETING_UNSUBSCRIBE_SUCCESS_COPY,
} from "@/constants/enterprise-marketing-engine/unsubscribe";

type View = "loading" | "invalid" | "ready" | "done" | "already";

export default function MarketingUnsubscribePage() {
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === "string" ? decodeURIComponent(params.token) : "";
  const [view, setView] = useState<View>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function peek() {
      if (!token) {
        if (!cancelled) setView("invalid");
        return;
      }
      try {
        const response = await fetch(`/api/marketing/unsubscribe?token=${encodeURIComponent(token)}`, {
          method: "GET",
          cache: "no-store",
        });
        if (!cancelled) setView(response.ok ? "ready" : "invalid");
      } catch {
        if (!cancelled) setView("invalid");
      }
    }
    void peek();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function confirm() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/marketing/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        alreadyUnsubscribed?: boolean;
      };
      if (!response.ok || !payload.ok) {
        setView("invalid");
        return;
      }
      setView(payload.alreadyUnsubscribed ? "already" : "done");
    } catch {
      setView("invalid");
    } finally {
      setBusy(false);
    }
  }

  const message =
    view === "invalid"
      ? MARKETING_UNSUBSCRIBE_GENERIC_INVALID
      : view === "already"
        ? MARKETING_UNSUBSCRIBE_ALREADY_COPY
        : view === "done"
          ? MARKETING_UNSUBSCRIBE_SUCCESS_COPY
          : MARKETING_UNSUBSCRIBE_CONFIRM_COPY;

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-900">
      <section className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-teal-700">Rupee Catalyst</p>
        <h1 className="mt-3 text-2xl font-semibold">Marketing emails</h1>
        {view === "loading" ? (
          <p className="mt-4 text-sm text-slate-500">Checking this link…</p>
        ) : (
          <p className="mt-4 text-base leading-relaxed text-slate-600">{message}</p>
        )}
        {view === "ready" ? (
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={busy}
            className="mt-6 rounded-lg bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {busy ? "Updating preference…" : "Unsubscribe from marketing emails"}
          </button>
        ) : null}
      </section>
    </main>
  );
}
