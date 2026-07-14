"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Brain, Moon, Shield, Sparkles, Sunrise } from "lucide-react";
import {
  CP5_FORBIDDEN_INFORMATION_LABELS,
  CP5_STATED_INFORMATION_DOMAINS,
} from "@/constants/chanakya-phase5-intelligence";
import {
  deriveChanakyaMorningBriefing,
  getChanakyaPhase5RegistrySnapshot,
  seedDemoChanakyaDayMemory,
  validateChanakyaPhase5Foundation,
  buildChanakyaDailyReflectionPackage,
  getProposalButtonLabel,
} from "@/lib/chanakya-phase5-intelligence";
import { ChanakyaAvatar, ChanakyaIdentityLabel } from "@/components/catalyst-one/chanakya-enterprise-identity";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthContext } from "@/components/providers/auth-provider";

/**
 * CF-CHANAKYA-015 — Phase 5 Foundation admin overview (new surface only).
 */
export function ChanakyaPhase5OverviewDashboard() {
  const { user } = useAuthContext();
  const firstName = user?.firstName?.trim() || "there";
  const [demoSeeded, setDemoSeeded] = useState(false);

  const snap = useMemo(() => getChanakyaPhase5RegistrySnapshot(), []);
  const validation = useMemo(() => validateChanakyaPhase5Foundation(), []);

  const briefing = useMemo(() => {
    if (demoSeeded) seedDemoChanakyaDayMemory();
    return deriveChanakyaMorningBriefing({ firstName });
  }, [demoSeeded, firstName]);

  const reflection = useMemo(() => {
    if (demoSeeded) seedDemoChanakyaDayMemory();
    return buildChanakyaDailyReflectionPackage({ firstName });
  }, [demoSeeded, firstName]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-4">
          <ChanakyaAvatar size="lg" priority />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">
              {snap.certificationFinding}
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">
              CHANAKYA Phase 5 · Enterprise Intelligence
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{snap.enterprisePrinciple}</p>
            <div className="mt-2">
              <ChanakyaIdentityLabel surface="advisory" />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill variant="muted">{snap.frameworkVersion}</StatusPill>
          <StatusPill variant={validation.valid ? "success" : "error"}>
            Foundation {validation.valid ? "valid" : "issues"}
          </StatusPill>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => {
              seedDemoChanakyaDayMemory();
              setDemoSeeded(true);
            }}
          >
            Seed demo day memory
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {snap.architectureRoles.map((role) => (
          <Card key={role.role} className="border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{role.owner}</CardTitle>
              <CardDescription className="text-[11px] uppercase tracking-wide">
                {role.role.replace(/_/g, " ")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs leading-relaxed text-muted-foreground">{role.responsibility}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-violet-600" />
              ChatGPT Contract
            </CardTitle>
            <CardDescription>Reasoning partner only — never business truth.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <p className="text-muted-foreground">{snap.chatgptContract.note}</p>
            <div>
              <p className="font-semibold text-foreground">Forbidden</p>
              <ul className="mt-1 list-inside list-disc text-muted-foreground">
                {snap.chatgptContract.forbiddenOperations.map((op) => (
                  <li key={op}>{op.replace(/_/g, " ")}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-foreground">Allowed</p>
              <ul className="mt-1 list-inside list-disc text-muted-foreground">
                {snap.chatgptContract.allowedOperations.map((op) => (
                  <li key={op}>{op.replace(/_/g, " ")}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Moon className="h-4 w-4 text-indigo-600" />
              Nightly Reflection · {snap.nightlyReflectionDefaultLocalTime}
            </CardTitle>
            <CardDescription>Structured package for overnight reasoning.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <p className="text-muted-foreground">{reflection.enterpriseSummary}</p>
            <p>
              <span className="font-semibold">User · </span>
              {reflection.userSummary}
            </p>
            <p>
              <span className="font-semibold">Tasks · </span>
              {reflection.taskStatus.completed} done · {reflection.taskStatus.pending} pending ·{" "}
              {reflection.taskStatus.overdue} overdue
            </p>
            <div>
              <p className="font-semibold">Files at risk</p>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                {reflection.filesAtRisk.slice(0, 3).map((f) => (
                  <li key={`${f.customerName}-${f.stage}`}>
                    {f.customerName} · {f.product} · {f.stage}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sunrise className="h-4 w-4 text-amber-600" />
            Morning Briefing Preview
          </CardTitle>
          <CardDescription>
            {briefing.salutation} — personalised items with direct navigation (foundation preview).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {briefing.narrative && (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs leading-relaxed">
              <p>
                <span className="font-semibold">What happened · </span>
                {briefing.narrative.whatHappened}
              </p>
              <p className="mt-1">
                <span className="font-semibold">Why it matters · </span>
                {briefing.narrative.whyItMatters}
              </p>
              <p className="mt-1">
                <span className="font-semibold">Next · </span>
                {briefing.narrative.nextRecommendation}
              </p>
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {briefing.items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-border/70 bg-background p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{item.customerName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {item.product} · {item.lender} · {item.currentStage}
                    </p>
                  </div>
                  <StatusPill variant={item.priority === 1 ? "warning" : "muted"}>P{item.priority}</StatusPill>
                </div>
                <p className="mt-2 text-xs text-foreground/90">{item.whyAttentionRequired}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.suggestedNextAction}</p>
                <Button asChild size="sm" className="mt-3 h-8 gap-1.5 text-xs">
                  <Link href={item.href}>
                    {item.navigationLabel}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-teal-600" />
              Proposal Intelligence
            </CardTitle>
            <CardDescription>
              Button label: <span className="font-semibold text-foreground">{getProposalButtonLabel()}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <ul className="space-y-1 text-muted-foreground">
              {snap.proposalConfig.products.map((p) => (
                <li key={p.productId}>
                  {p.productName} · min ₹{p.minimumLoanAmount.toLocaleString("en-IN")} ·{" "}
                  {p.enabled ? "enabled" : "disabled"}
                </li>
              ))}
            </ul>
            <p className="font-semibold text-foreground">Stated Information domains</p>
            <ul className="list-inside list-disc text-muted-foreground">
              {CP5_STATED_INFORMATION_DOMAINS.map((d) => (
                <li key={d.id}>{d.label}</li>
              ))}
            </ul>
            <p className="text-muted-foreground">
              Never use: {CP5_FORBIDDEN_INFORMATION_LABELS.map((l) => l.replace(/_/g, " ")).join(", ")}.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Brain className="h-4 w-4 text-sky-600" />
              Capabilities & Non-negotiables
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-xs sm:grid-cols-2">
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              {snap.capabilities.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              {snap.nonNegotiables.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
