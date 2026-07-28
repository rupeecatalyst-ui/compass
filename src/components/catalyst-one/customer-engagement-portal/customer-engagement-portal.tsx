"use client";

/**
 * CO-BIZ-004 — Enterprise Customer Engagement Portal shell.
 * Token-scoped projection of Deal · ETE · Documents · EDC. No ERP chrome.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";
import { ECE_PORTAL_TABS } from "@/constants/enterprise-customer-engagement";
import { CustomerDocumentCollectionPortal } from "@/components/catalyst-one/customer-document-portal";
import {
  composeCustomerEngagementSnapshot,
  postCustomerQuestion,
  subscribeEceMessagesUpdated,
} from "@/lib/enterprise-customer-engagement";
import {
  recordPortalOpened,
  subscribeDocumentRequestsUpdated,
} from "@/lib/document-requests";
import { subscribeDocumentRegistryUpdated } from "@/lib/document-registry";
import type {
  EceEngagementSnapshot,
  EcePortalTab,
} from "@/types/enterprise-customer-engagement";
import { cn } from "@/lib/utils";

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function cxBandClass(band: EceEngagementSnapshot["cxScore"]["band"]): string {
  switch (band) {
    case "excellent":
      return "text-emerald-300";
    case "good":
      return "text-teal-300";
    case "fair":
      return "text-amber-300";
    default:
      return "text-rose-300";
  }
}

export function CustomerEngagementPortal({ token }: { token: string }) {
  const [tab, setTab] = useState<EcePortalTab>("dashboard");
  const [snap, setSnap] = useState<EceEngagementSnapshot | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);

  const reload = useCallback(
    (opts?: { audit?: boolean }) => {
      if (!token.trim()) {
        setSnap(null);
        return;
      }
      setSnap(composeCustomerEngagementSnapshot(token, { audit: opts?.audit ?? false }));
    },
    [token],
  );

  useEffect(() => {
    reload({ audit: true });
    const u1 = subscribeDocumentRequestsUpdated(() => reload({ audit: false }));
    const u2 = subscribeDocumentRegistryUpdated(() => reload({ audit: false }));
    const u3 = subscribeEceMessagesUpdated(() => reload({ audit: false }));
    return () => {
      u1();
      u2();
      u3();
    };
  }, [reload]);

  useEffect(() => {
    if (!snap?.tokenValid || !snap.opportunityId || opened) return;
    setOpened(true);
    recordPortalOpened(token, snap.opportunityId);
  }, [snap, token, opened]);

  const dash = snap?.dashboard;
  const title = useMemo(
    () => dash?.opportunity.customerName || "Customer Engagement",
    [dash?.opportunity.customerName],
  );

  if (!token.trim()) {
    return <InvalidLink />;
  }

  if (!snap) {
    return (
      <main className="min-h-dvh bg-zinc-950">
        <ChanakyaLoadingExperience
          module="enterprise"
          statusLabel="Preparing your engagement workspace..."
          surface="command"
          density="page"
          useEbiSignals={false}
        />
      </main>
    );
  }

  if (!snap.tokenValid || !dash) {
    return <InvalidLink />;
  }

  const sendMessage = () => {
    const body = messageDraft.trim();
    if (!body) return;
    try {
      postCustomerQuestion({
        opportunityId: snap.opportunityId,
        opportunityReference: snap.opportunityReference,
        body,
        customerName: dash.opportunity.customerName,
      });
      setMessageDraft("");
      setFlash("Message sent to your Relationship Manager.");
      reload({ audit: false });
    } catch (e) {
      setFlash(e instanceof Error ? e.message : "Unable to send message.");
    }
  };

  return (
    <main className="min-h-dvh bg-[radial-gradient(ellipse_at_top,#0f766e22,transparent_55%),#09090b] px-3 py-5 text-zinc-100 sm:px-4 sm:py-8">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <header className="rounded-2xl border border-white/10 bg-zinc-900/85 p-4 shadow-xl backdrop-blur sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-300/90">
            Rupee Catalyst · Customer Engagement
          </p>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
              <p className="mt-1 text-sm text-zinc-400">
                {dash.opportunity.reference} · {dash.opportunity.productLabel}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-right">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">Experience</p>
              <p className={cn("text-lg font-semibold tabular-nums", cxBandClass(snap.cxScore.band))}>
                {snap.cxScore.overall}
                <span className="ml-1 text-xs font-normal capitalize text-zinc-400">
                  {snap.cxScore.band.replace("_", " ")}
                </span>
              </p>
            </div>
          </div>
          <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
            <Meta label="Current Stage" value={dash.currentStage} />
            <Meta label="Relationship Manager" value={dash.relationshipManager} />
            <Meta
              label="Next Action"
              value={dash.nextRequiredAction || "No action required right now"}
            />
          </dl>
        </header>

        <nav
          className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-zinc-900/70 p-1"
          aria-label="Customer portal sections"
        >
          {ECE_PORTAL_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                tab === t.id
                  ? "bg-teal-600 text-white"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {flash ? (
          <p className="rounded-lg border border-teal-500/30 bg-teal-950/40 px-3 py-2 text-sm text-teal-100">
            {flash}
          </p>
        ) : null}

        {tab === "dashboard" ? (
          <section className="space-y-4">
            <Card title="Application status" icon={<LayoutDashboard className="h-4 w-4" />}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Stat label="Application" value={dash.opportunity.applicationStatus} />
                <Stat label="Expected next milestone" value={dash.expectedNextMilestone || "—"} />
                <Stat
                  label="Document progress"
                  value={`${dash.documentProgress.completionPct}% · ${dash.documentProgress.bandLabel}`}
                />
                <Stat label="Active deals" value={String(dash.deals.length)} />
              </div>
            </Card>

            {dash.deals.length > 0 ? (
              <Card title="Active deals" icon={<FileText className="h-4 w-4" />}>
                <ul className="space-y-2">
                  {dash.deals.map((d) => (
                    <li
                      key={d.dealId}
                      className="rounded-lg border border-white/5 bg-zinc-950/50 px-3 py-2 text-sm"
                    >
                      <p className="font-medium">{d.fileNumber}</p>
                      <p className="text-zinc-400">
                        {d.productLabel} · {d.amountLabel} · {d.stageLabel}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : (
              <Card title="Active opportunities" icon={<Sparkles className="h-4 w-4" />}>
                <p className="text-sm text-zinc-300">
                  Opportunity <span className="font-medium text-zinc-100">{dash.opportunity.reference}</span>{" "}
                  is active at stage <span className="font-medium">{dash.currentStage}</span>.
                </p>
              </Card>
            )}

            <Card title="Recent activity" icon={<Bell className="h-4 w-4" />}>
              {dash.recentActivity.length === 0 ? (
                <p className="text-sm text-zinc-500">No recent activity yet.</p>
              ) : (
                <ul className="space-y-2">
                  {dash.recentActivity.map((e) => (
                    <li key={e.id} className="border-b border-white/5 pb-2 text-sm last:border-0">
                      <p className="font-medium">{e.title}</p>
                      <p className="text-xs text-zinc-500">{formatWhen(e.at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Experience score" icon={<CheckCircle2 className="h-4 w-4" />}>
              <ul className="space-y-2">
                {snap.cxScore.dimensions.map((d) => (
                  <li key={d.id} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <p className="font-medium">{d.label}</p>
                      <p className="text-xs text-zinc-500">{d.rationale}</p>
                    </div>
                    <span className="tabular-nums text-teal-200">{d.score}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        ) : null}

        {tab === "tasks" ? (
          <Card title="Actions for you" icon={<ListTodo className="h-4 w-4" />}>
            {snap.tasks.length === 0 ? (
              <p className="text-sm text-zinc-400">
                Nothing pending. We will notify you when an action is required.
              </p>
            ) : (
              <ul className="space-y-3">
                {snap.tasks.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-lg border border-white/10 bg-zinc-950/40 px-3 py-3"
                  >
                    <p className="text-sm font-semibold">{t.title}</p>
                    <p className="mt-1 text-xs text-zinc-400">{t.description}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-200">
                        {t.status}
                      </span>
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
                        {t.source === "ete" ? "Task" : "Document"}
                      </span>
                      {t.documentTypeRef ? (
                        <button
                          type="button"
                          className="text-[11px] font-medium text-teal-300 underline-offset-2 hover:underline"
                          onClick={() => setTab("documents")}
                        >
                          Open Documents
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : null}

        {tab === "documents" ? (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <CustomerDocumentCollectionPortal token={token} mode="embedded" />
          </div>
        ) : null}

        {tab === "timeline" ? (
          <Card title="Application timeline" icon={<FileText className="h-4 w-4" />}>
            {snap.timeline.length === 0 ? (
              <p className="text-sm text-zinc-500">Timeline will appear as your application progresses.</p>
            ) : (
              <ol className="relative space-y-3 border-l border-teal-500/30 pl-4">
                {snap.timeline.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[1.28rem] top-1.5 h-2.5 w-2.5 rounded-full bg-teal-400" />
                    <p className="text-sm font-medium">{e.title}</p>
                    {e.description ? (
                      <p className="text-xs text-zinc-400">{e.description}</p>
                    ) : null}
                    <p className="mt-0.5 text-[11px] text-zinc-500">
                      {formatWhen(e.at)} · {e.category.replace("_", " ")}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        ) : null}

        {tab === "notifications" ? (
          <Card title="Updates" icon={<Bell className="h-4 w-4" />}>
            {snap.notifications.length === 0 ? (
              <p className="text-sm text-zinc-500">No updates yet.</p>
            ) : (
              <ul className="space-y-2">
                {snap.notifications.map((n) => (
                  <li
                    key={n.id}
                    className="rounded-lg border border-white/5 bg-zinc-950/50 px-3 py-2 text-sm"
                  >
                    <p className="font-medium">{n.title}</p>
                    <p className="text-zinc-400">{n.body}</p>
                    <p className="mt-1 text-[11px] text-zinc-500">{formatWhen(n.at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : null}

        {tab === "messages" ? (
          <Card title="Messages" icon={<MessageSquare className="h-4 w-4" />}>
            <div className="mb-3 max-h-72 space-y-2 overflow-y-auto">
              {snap.messages.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  Ask a question about your application. Your Relationship Manager will respond here.
                </p>
              ) : (
                snap.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm",
                      m.role === "customer"
                        ? "ml-6 bg-teal-900/40 text-teal-50"
                        : "mr-6 bg-zinc-800/80 text-zinc-100",
                    )}
                  >
                    <p className="text-[10px] uppercase tracking-wide text-zinc-400">
                      {m.authorLabel}
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap">{m.body}</p>
                    <p className="mt-1 text-[10px] text-zinc-500">{formatWhen(m.at)}</p>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask about your application…"
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/40"
              />
              <button
                type="button"
                onClick={sendMessage}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-500"
              >
                <Send className="h-4 w-4" />
                Send
              </button>
            </div>
          </Card>
        ) : null}

        <p className="pb-4 text-center text-[11px] text-zinc-600">
          Secure token portal ·{" "}
          <Link
            href={`/document-upload/${encodeURIComponent(token)}`}
            className="text-teal-500/80 hover:text-teal-400"
          >
            Documents-only view
          </Link>
        </p>
      </div>
    </main>
  );
}

function InvalidLink() {
  return (
    <main className="min-h-dvh bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="mx-auto max-w-lg rounded-2xl border border-rose-500/30 bg-zinc-900/80 p-6 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-rose-300" />
        <h1 className="mt-3 text-lg font-semibold">Link unavailable</h1>
        <p className="mt-2 text-sm text-zinc-400">
          This secure engagement link is invalid, expired, or has been replaced. Please contact your
          Relationship Manager for a new link.
        </p>
      </div>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-zinc-950/40 px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-zinc-100">{value}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-zinc-100">{value}</p>
    </div>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900/75 p-4">
      <div className="mb-3 flex items-center gap-2 text-teal-200">
        {icon}
        <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
      </div>
      {children}
    </section>
  );
}
