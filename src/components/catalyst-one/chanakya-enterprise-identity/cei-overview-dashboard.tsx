"use client";

import Link from "next/link";
import { Brain, Snowflake } from "lucide-react";
import {
  CEI_COMMUNICATION_CONTRACT,
  CEI_COMMUNICATION_NEVER,
  CEI_FUTURE_AVATAR_CAPABILITIES,
  CEI_FORBIDDEN_PERSONAS,
  CEI_PERSONALITY_ROLES,
} from "@/constants/chanakya-enterprise-identity";
import { ROUTES } from "@/constants/routes";
import { getChanakyaIdentityRegistrySnapshot } from "@/lib/chanakya-enterprise-identity";
import { ChanakyaAvatar } from "./chanakya-avatar";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * CF-CHANAKYA-009 — Enterprise Identity Framework admin overview.
 */
export function CeiOverviewDashboard() {
  const snap = getChanakyaIdentityRegistrySnapshot();

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
              {snap.officialTitle} · {snap.officialSubtitle}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{snap.enterprisePrinciple}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill variant="muted">{snap.frameworkVersion}</StatusPill>
          <Button size="sm" className="h-8 gap-1.5 text-xs" asChild>
            <Link href={ROUTES.DECISIONS}>
              <Brain className="h-3.5 w-3.5" />
              Experience Console
            </Link>
          </Button>
        </div>
      </div>

      <Card className="glass-card border-border/60">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Architecture Freeze</CardTitle>
            <StatusPill variant="info">{snap.certificationFinding}</StatusPill>
          </div>
          <CardDescription className="mt-2 flex items-start gap-2">
            <Snowflake className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-500" />
            <span>{snap.architectureFreezeNote}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border/50 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Active avatar</p>
            <p className="text-sm font-semibold">{snap.activeAvatarPack.name}</p>
          </div>
          <div className="rounded-lg border border-border/50 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Avatar packs</p>
            <p className="text-xl font-semibold tabular-nums">{snap.avatarPackCount}</p>
          </div>
          <div className="rounded-lg border border-border/50 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Frozen since</p>
            <p className="text-xl font-semibold tabular-nums">{snap.frozenAt}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Intelligence Layer</CardTitle>
            <CardDescription>CHANAKYA thinks — engines reason, remember, and coach.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {snap.intelligenceEngines.map((engine) => (
              <div
                key={engine.key}
                className="rounded-lg border border-border/50 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{engine.name}</p>
                  <StatusPill variant="success">active</StatusPill>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{engine.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Presentation Layer</CardTitle>
            <CardDescription>The interface presents CHANAKYA — never the reverse.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {snap.presentationChannels.map((channel) => (
              <div
                key={channel.key}
                className="rounded-lg border border-border/50 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{channel.name}</p>
                  <StatusPill variant={channel.status === "active" ? "success" : "muted"}>
                    {channel.status}
                  </StatusPill>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{channel.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Personality</CardTitle>
            <CardDescription>Always behaves as enterprise leadership — never as a generic bot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {snap.personalityRoles.map((role) => {
              const meta = CEI_PERSONALITY_ROLES[role];
              return (
                <div key={role} className="rounded-lg border border-teal-500/20 bg-teal-500/5 px-3 py-2">
                  <p className="text-sm font-medium text-teal-800 dark:text-teal-200">{meta.label}</p>
                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Never Behave As</CardTitle>
            <CardDescription>Forbidden personas — architecture guardrails.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {snap.forbiddenPersonas.map((persona) => {
              const meta = CEI_FORBIDDEN_PERSONAS[persona];
              return (
                <div key={persona} className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2">
                  <p className="text-sm font-medium text-rose-800 dark:text-rose-200">{meta.label}</p>
                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Communication Contract</CardTitle>
          <CardDescription>Short. Professional. Business-oriented. Personalized.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {CEI_COMMUNICATION_CONTRACT.map((item) => (
              <span
                key={item}
                className="rounded-md border border-violet-500/25 bg-violet-500/5 px-2.5 py-1 text-xs font-medium text-violet-800 dark:text-violet-200"
              >
                {item}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {CEI_COMMUNICATION_NEVER.map((item) => (
              <span
                key={item}
                className="rounded-md border border-border/60 px-2.5 py-1 text-xs text-muted-foreground line-through decoration-rose-400/60"
              >
                {item}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Avatar Framework — Future</CardTitle>
          <CardDescription>
            Configurable from Experience Console — packs, expressions, themes, and brand customization.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {CEI_FUTURE_AVATAR_CAPABILITIES.map((cap) => (
            <span
              key={cap}
              className="rounded-md border border-sky-500/25 bg-sky-500/5 px-2.5 py-1 text-xs font-medium text-sky-800 dark:text-sky-200"
            >
              {cap}
            </span>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
