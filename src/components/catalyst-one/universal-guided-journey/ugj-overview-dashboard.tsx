"use client";

import Link from "next/link";
import {
  UGJ_ENTERPRISE_PRINCIPLE,
  UGJ_FRAMEWORK_VERSION,
  UGJ_INTERACTION_CONTRACT,
} from "@/constants/universal-guided-journey";
import { ROUTES } from "@/constants/routes";
import { getUgjRegistrySnapshot } from "@/lib/universal-guided-journey";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquareHeart } from "lucide-react";

/**
 * CF-CHANAKYA-008 — Admin architecture view for Universal Guided Journey.
 */
export function UgjOverviewDashboard() {
  const snap = getUgjRegistrySnapshot();

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">
            CHANAKYA · CF-CHANAKYA-008
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">Universal Guided Journey</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{UGJ_ENTERPRISE_PRINCIPLE}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill variant="muted">{UGJ_FRAMEWORK_VERSION}</StatusPill>
          <Button size="sm" className="h-8 gap-1.5 text-xs" asChild>
            <Link href={ROUTES.CONTACTS}>
              <MessageSquareHeart className="h-3.5 w-3.5" />
              Open Contact Creation
            </Link>
          </Button>
        </div>
      </div>

      <Card className="glass-card border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Interaction Contract</CardTitle>
          <CardDescription>
            Every major workflow begins with this conversational framework.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {UGJ_INTERACTION_CONTRACT.map((item) => (
            <span
              key={item}
              className="rounded-md border border-violet-500/25 bg-violet-500/5 px-2.5 py-1 text-xs font-medium text-violet-800 dark:text-violet-200"
            >
              {item}
            </span>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="glass-card border-border/60">
          <CardHeader className="pb-2">
            <CardDescription>Registered journeys</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{snap.journeyCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass-card border-border/60">
          <CardHeader className="pb-2">
            <CardDescription>Reference journey</CardDescription>
            <CardTitle className="text-lg">Contact Creation</CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass-card border-border/60">
          <CardHeader className="pb-2">
            <CardDescription>Pattern</CardDescription>
            <CardTitle className="text-lg">Conversation → Workspace</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-3">
        {snap.journeys.map((journey) => (
          <Card key={journey.id} className="glass-card border-border/60">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">{journey.name}</CardTitle>
                <StatusPill variant="muted">{journey.journeyCode}</StatusPill>
                {journey.status === "reference" ? (
                  <StatusPill variant="success">reference</StatusPill>
                ) : (
                  <StatusPill variant="info">registered</StatusPill>
                )}
              </div>
              <CardDescription>{journey.description}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 text-xs sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground">Steps</p>
                <p className="font-medium tabular-nums">{journey.steps.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Workspace after conversation</p>
                <p className="font-medium">{journey.workspaceTargetLabel}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Auto-save</p>
                <p className="font-medium">{journey.supportsAutoSave ? "Enabled" : "Off"}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
