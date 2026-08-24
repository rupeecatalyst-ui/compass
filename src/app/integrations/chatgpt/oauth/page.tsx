"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type OAuthRequestMeta = {
  requestId: string;
  clientName: string;
  scopes: string[];
  state: string;
  expiresAt: string;
};

function ChatGptOAuthConsentInner() {
  const searchParams = useSearchParams();
  const requestId = searchParams.get("request") ?? "";

  const [meta, setMeta] = useState<OAuthRequestMeta | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [employeeToken, setEmployeeToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!requestId) {
      setLoadError("Missing OAuth request.");
      return;
    }
    void (async () => {
      try {
        const res = await fetch(
          `/api/integrations/chatgpt/v1/oauth/request?request=${encodeURIComponent(requestId)}`,
        );
        const body = (await res.json()) as {
          success?: boolean;
          data?: OAuthRequestMeta;
          error?: { message?: string };
        };
        if (!res.ok || !body.success || !body.data) {
          setLoadError(body.error?.message ?? "OAuth request expired or invalid.");
          return;
        }
        setMeta(body.data);
      } catch {
        setLoadError("Unable to load OAuth request.");
      }
    })();
  }, [requestId]);

  const handleLogin = useCallback(async () => {
    setActionError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = (await res.json()) as {
        success?: boolean;
        data?: { accessToken?: string };
        error?: { message?: string };
      };
      if (!res.ok || !body.success || !body.data?.accessToken) {
        setActionError(body.error?.message ?? "Login failed.");
        return;
      }
      setEmployeeToken(body.data.accessToken);
    } catch {
      setActionError("Login failed.");
    } finally {
      setBusy(false);
    }
  }, [email, password]);

  const handleApprove = useCallback(async () => {
    if (!employeeToken || !requestId) return;
    setActionError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/integrations/chatgpt/v1/oauth/consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${employeeToken}`,
        },
        body: JSON.stringify({ requestId }),
      });
      const body = (await res.json()) as {
        success?: boolean;
        data?: { redirectUrl?: string };
        error?: { message?: string };
      };
      if (!res.ok || !body.success || !body.data?.redirectUrl) {
        setActionError(body.error?.message ?? "Authorization denied.");
        return;
      }
      window.location.href = body.data.redirectUrl;
    } catch {
      setActionError("Authorization failed.");
    } finally {
      setBusy(false);
    }
  }, [employeeToken, requestId]);

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <header className="space-y-1">
          <h1 className="text-lg font-semibold">Authorize ChatGPT</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to Catalyst One to allow read-only operational intelligence access via ChatGPT.
          </p>
        </header>

        {loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : meta ? (
          <>
            <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-2">
              <p>
                <span className="text-muted-foreground">Application:</span> {meta.clientName}
              </p>
              <p>
                <span className="text-muted-foreground">Scopes:</span>{" "}
                {meta.scopes.join(", ") || "chatgpt:read"}
              </p>
            </div>

            {!employeeToken ? (
              <div className="space-y-3">
                <label className="block space-y-1">
                  <span className="text-sm">Email</span>
                  <input
                    type="email"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm">Password</span>
                  <input
                    type="password"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </label>
                <button
                  type="button"
                  className="w-full rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
                  disabled={busy || !email || !password}
                  onClick={() => void handleLogin()}
                >
                  Sign in
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="w-full rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
                disabled={busy}
                onClick={() => void handleApprove()}
              >
                Authorize ChatGPT
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Loading authorization request…</p>
        )}

        {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
      </div>
    </main>
  );
}

/** CO-CHATGPT-OAUTH-001 — Browser consent + Catalyst One login for ChatGPT OAuth. */
export default function ChatGptOAuthConsentPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background flex items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">Loading authorization request…</p>
        </main>
      }
    >
      <ChatGptOAuthConsentInner />
    </Suspense>
  );
}
