"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Building2,
  ClipboardCheck,
  FileStack,
  Landmark,
  Loader2,
  PenLine,
  Sparkles,
  Users,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { organizationWorkspaceApi } from "@/lib/enterprise-organization-workspace";
import { Card, CardContent } from "@/components/ui/card";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { OrganizationDashboardStat } from "@/types/organization";

const iconMap = {
  documents: FileStack,
  directors: Users,
  bank: Landmark,
  signature: PenLine,
  compliance: ClipboardCheck,
  studio: Sparkles,
} as const;

const accentMap = {
  primary: "from-primary/15 to-primary/5 text-primary border-primary/20",
  accent: "from-accent/15 to-accent/5 text-accent border-accent/20",
  warning: "from-warning/15 to-warning/5 text-warning border-warning/20",
  info: "from-info/15 to-info/5 text-info border-info/20",
};

export function OrganizationKpiGrid() {
  const [stats, setStats] = useState<OrganizationDashboardStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [documents, directors, accounts, signatures] = await Promise.all([
          organizationWorkspaceApi.listDocuments("active"),
          organizationWorkspaceApi.listDirectors(),
          organizationWorkspaceApi.listBankAccounts(),
          organizationWorkspaceApi.listDigitalSignatures(),
        ]);
        if (cancelled) return;

        const activeDirectors = directors.filter((d) => !d.isDeleted);
        const activeAccounts = accounts.filter((a) => !a.isDeleted);
        const activeSignatures = signatures.filter((s) => !s.isDeleted);
        const expiringSoon = activeSignatures.filter((s) => s.status === "expiring").length;

        setStats([
          {
            id: "corp-docs",
            label: "Corporate Documents",
            value: String(documents.length),
            subValue: "Active in organization registry",
            icon: "documents",
            accent: "primary",
            href: ROUTES.ORGANIZATION_CORPORATE_REPOSITORY,
          },
          {
            id: "directors",
            label: "Directors",
            value: String(activeDirectors.length),
            subValue: `${activeDirectors.filter((d) => d.status === "active").length} active`,
            icon: "directors",
            accent: "info",
            href: ROUTES.ORGANIZATION_DIRECTORS,
          },
          {
            id: "bank-accounts",
            label: "Bank Accounts",
            value: String(activeAccounts.length),
            subValue: `${activeAccounts.filter((a) => a.isPrimary).length} primary`,
            icon: "bank",
            accent: "accent",
            href: ROUTES.ORGANIZATION_BANK_ACCOUNTS,
          },
          {
            id: "digital-signatures",
            label: "Digital Signatures",
            value: String(activeSignatures.length),
            subValue:
              expiringSoon > 0 ? `${expiringSoon} expiring soon` : "All signatures tracked",
            icon: "signature",
            accent: "warning",
            href: ROUTES.ORGANIZATION_DIGITAL_SIGNATURES,
          },
        ]);
      } catch {
        if (!cancelled) setStats([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading KPIs…
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        No organization KPIs available yet.
      </p>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
    >
      {stats.map((stat) => {
        const Icon = iconMap[stat.icon as keyof typeof iconMap] ?? Building2;
        const accent = accentMap[stat.accent ?? "primary"];
        const content = (
          <Card
            className={cn(
              "glass-card overflow-hidden border-border/60 transition-all",
              stat.href && "hover:border-primary/30 hover:shadow-md cursor-pointer",
              stat.placeholder && "opacity-90",
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-2 min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                  {stat.subValue && (
                    <p className="text-xs text-muted-foreground">{stat.subValue}</p>
                  )}
                </div>
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-gradient-to-br",
                    accent,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        );

        return (
          <motion.div
            key={stat.id}
            variants={staggerItem}
            whileHover={stat.href ? { scale: 1.01, y: -2 } : undefined}
          >
            {stat.href ? (
              <Link href={stat.href} className="block">
                {content}
              </Link>
            ) : (
              content
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
