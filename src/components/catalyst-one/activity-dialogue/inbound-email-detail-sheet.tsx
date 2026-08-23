"use client";

/**
 * Activity & Dialogue — open inbound email from EAR chronology (read-only).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { formatRelativeTime, cn } from "@/lib/utils";

export type InboundEmailDetailDto = {
  id: string;
  messageId: string;
  fromEmail: string;
  fromName: string | null;
  toEmails: string[];
  ccEmails: string[];
  replyToEmail: string | null;
  subject: string;
  textBody: string | null;
  receivedAt: string;
  senderRole: string | null;
  matchStatus: string;
  matchReason: string | null;
  opportunityId: string | null;
  dealId: string | null;
  contactId: string | null;
  attachmentCount: number;
  attachments: Array<{
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    documentId: string | null;
  }>;
};

type Props = {
  inboundEmailId: string;
  open: boolean;
  onClose: () => void;
};

export function InboundEmailDetailSheet({ inboundEmailId, open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [item, setItem] = useState<InboundEmailDetailDto | null>(null);

  useEffect(() => {
    if (!open || !inboundEmailId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetch(`/api/enterprise-inbound-emails/${encodeURIComponent(inboundEmailId)}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load this email");
        const json = (await res.json()) as {
          data?: { item?: InboundEmailDetailDto };
          item?: InboundEmailDetailDto;
        };
        return json.data?.item ?? json.item ?? null;
      })
      .then((row) => {
        if (!cancelled) setItem(row);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load email");
          setItem(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, inboundEmailId]);

  if (!open) return null;

  const needsAttention =
    item?.matchStatus === "needs_review" ||
    item?.matchStatus === "unmatched" ||
    item?.matchStatus === "received";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Incoming email"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-start gap-2">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-700 dark:text-violet-300">
              <Mail className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Incoming email
              </p>
              <h2 className="truncate text-sm font-semibold text-foreground">
                {item?.subject || (loading ? "Loading…" : "Email")}
              </h2>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 shrink-0 p-0"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="space-y-2" aria-busy>
              <div className="h-4 animate-pulse rounded bg-muted/60" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted/60" />
              <div className="mt-4 h-24 animate-pulse rounded bg-muted/40" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : item ? (
            <div className="space-y-3 text-sm">
              {needsAttention ? (
                <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-900 dark:text-amber-200">
                  Needs Attention — not yet linked to a Customer / Opportunity
                  {item.matchStatus ? ` (${item.matchStatus})` : ""}
                </p>
              ) : null}
              <dl className="space-y-1.5 text-xs">
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-muted-foreground">From</dt>
                  <dd className="min-w-0 font-medium text-foreground">
                    {item.fromName ? `${item.fromName} <${item.fromEmail}>` : item.fromEmail}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-muted-foreground">To</dt>
                  <dd className="min-w-0 text-foreground">
                    {(item.toEmails as string[]).join(", ") || "—"}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-muted-foreground">Received</dt>
                  <dd className="tabular-nums text-foreground">
                    {formatRelativeTime(item.receivedAt)} ·{" "}
                    {new Date(item.receivedAt).toLocaleString()}
                  </dd>
                </div>
              </dl>
              <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
                  {item.textBody?.trim() || "(No text body)"}
                </p>
              </div>
              {item.attachments.length > 0 ? (
                <ul className="space-y-1">
                  {item.attachments.map((att) => (
                    <li
                      key={att.id}
                      className="flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5 text-xs"
                    >
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1 truncate font-medium">{att.filename}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {Math.round(att.sizeBytes / 1024)} KB
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-1">
                {item.opportunityId ? (
                  <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                    <Link
                      href={`${ROUTES.OPPORTUNITY_WORKSPACE}?opportunityId=${encodeURIComponent(item.opportunityId)}`}
                    >
                      Open Opportunity
                    </Link>
                  </Button>
                ) : null}
                {item.dealId ? (
                  <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                    <Link href={`/deals/${encodeURIComponent(item.dealId)}`}>Open Deal</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function isInboundEmailTimelineItem(item: {
  category?: string;
  inboundEmailId?: string | null;
}): boolean {
  return item.category === "incoming_email" || Boolean(item.inboundEmailId);
}

export function inboundEmailChipClass(needsAttention: boolean): string {
  return cn(
    "inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
    needsAttention
      ? "border-amber-500/50 bg-amber-500/15 text-amber-900 dark:text-amber-200"
      : "border-violet-500/40 bg-violet-500/10 text-violet-900 dark:text-violet-200",
  );
}
