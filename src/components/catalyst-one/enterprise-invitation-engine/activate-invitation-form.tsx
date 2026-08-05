"use client";

/**
 * CO-INV-001 — Public activation form (password · terms · profile).
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SITE } from "@/lib/site";

interface ActivateInvitationFormProps {
  token: string;
}

type Preview = {
  recipientName: string;
  recipientEmail: string;
  entityLabel?: string | null;
  expiresAt: string;
  inviteeKind: string;
};

export function ActivateInvitationForm({ token }: ActivateInvitationFormProps) {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [profileCity, setProfileCity] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/activate/${encodeURIComponent(token)}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json?.error?.message || "Invalid or expired invitation");
        }
        if (!cancelled) {
          const data = json.data as Preview;
          setPreview(data);
          setFullName(data.recipientName || "");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Invitation unavailable");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/activate/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          confirmPassword,
          acceptTerms,
          fullName,
          mobile,
          profileCity,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error?.message || "Activation failed");
      }
      const redirectUrl = String(json.data?.redirectUrl || "/login");
      router.replace(redirectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Activation failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Verifying invitation…
      </div>
    );
  }

  if (error && !preview) {
    return (
      <div className="space-y-2 py-10 text-center">
        <p className="text-sm font-medium text-destructive">{error}</p>
        <p className="text-xs text-muted-foreground">
          Contact support at {SITE.email} if you need a new invitation.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-4">
      <div className="space-y-1 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={SITE.logoUrl}
          alt={SITE.name}
          className="mx-auto mb-3 h-12 w-auto rounded bg-white p-1"
        />
        <h1 className="text-xl font-semibold tracking-tight">Activate your account</h1>
        <p className="text-xs text-muted-foreground">
          Welcome {preview?.recipientName}. Complete your profile to join Catalyst Connect.
        </p>
        {preview?.expiresAt ? (
          <p className="text-[11px] text-muted-foreground">
            Link expires {new Date(preview.expiresAt).toLocaleString("en-IN")}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={preview?.recipientEmail || ""} disabled />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="mobile">Mobile</Label>
          <Input
            id="mobile"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={profileCity}
            onChange={(e) => setProfileCity(e.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Create password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          minLength={8}
          required
        />
      </div>

      <label className="flex items-start gap-2 text-xs leading-snug text-muted-foreground">
        <Checkbox
          checked={acceptTerms}
          onCheckedChange={(v) => setAcceptTerms(v === true)}
          className="mt-0.5"
        />
        <span>
          I accept the Terms &amp; Conditions and Privacy Policy of {SITE.name}.
        </span>
      </label>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <Button type="submit" className="w-full" disabled={submitting || !acceptTerms}>
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Activating…
          </>
        ) : (
          "Activate & continue to Catalyst Connect"
        )}
      </Button>
    </form>
  );
}
