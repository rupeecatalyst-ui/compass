"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  FileText,
  Phone,
} from "lucide-react";
import {
  ELW_DEFAULT_PRODUCTS,
  ELW_FRAMEWORK_VERSION,
  ELW_OFFICIAL_NAME,
  ELW_PRODUCT_POLICY_SECTIONS,
} from "@/constants/enterprise-lender-workspace";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { WorkspacePrimaryActions } from "@/components/catalyst-one/shared/workspace-primary-actions";
import {
  applyElwSelectLender,
  deriveElwLenderProfile,
  getElwOriginLabel,
  parseElwOriginFromSearchParams,
} from "@/lib/enterprise-lender-workspace";
import { deriveElwHierarchy } from "@/lib/enterprise-lender-workspace/hierarchy";
import { toast } from "sonner";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import { ElwHierarchyChart } from "./elw-hierarchy-chart";

export interface EnterpriseLenderWorkspaceProps {
  lenderId: string;
  /** When embedded (e.g. Analyze Deal → View Policy), skip page chrome navigation. */
  presentation?: "page" | "embedded";
  initialProductId?: string;
  initialProductLabel?: string;
  onClose?: () => void;
  closeLabel?: string;
}

/**
 * Enterprise Lender Workspace — knowledge center (Phase 1 UI / architecture).
 * Product context drives policy placeholders. No credit calculations.
 */
export function EnterpriseLenderWorkspace({
  lenderId,
  presentation = "page",
  initialProductId,
  initialProductLabel,
  onClose,
  closeLabel,
}: EnterpriseLenderWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState("");
  const [hierarchyTick, setHierarchyTick] = useState(0);
  const [activeProductId, setActiveProductId] = useState(
    initialProductId ?? ELW_DEFAULT_PRODUCTS[0].id,
  );

  const origin = useMemo(
    () => parseElwOriginFromSearchParams(searchParams),
    [searchParams],
  );

  const profile = useMemo(() => deriveElwLenderProfile(lenderId), [lenderId]);

  const hierarchy = useMemo(() => {
    void hierarchyTick;
    return deriveElwHierarchy(lenderId);
  }, [lenderId, hierarchyTick]);

  const products = useMemo(() => {
    if (!profile) return [...ELW_DEFAULT_PRODUCTS];
    if (profile.products.length === 0) return [...ELW_DEFAULT_PRODUCTS];
    return profile.products.map((p) => ({
      productRef: p.productRef,
      label: p.label,
      id: p.productRef.replace(/^product:/, ""),
    }));
  }, [profile]);

  const activeProduct =
    products.find((p) => p.id === activeProductId) ??
    products[0] ??
    ELW_DEFAULT_PRODUCTS[0];

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">Lender not found in the enterprise registry.</p>
        <Button asChild variant="outline" size="sm">
          <Link href={ROUTES.LENDERS}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Lenders
          </Link>
        </Button>
      </div>
    );
  }

  const originLabel = getElwOriginLabel(origin.from);
  const initials = profile.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const onSelectLender = () => {
    setBusy(true);
    try {
      const result = applyElwSelectLender(profile, origin);
      toast.success(result.message);
      router.push(result.returnTo);
    } finally {
      setBusy(false);
    }
  };

  const onBack = () => {
    if (presentation === "embedded" && onClose) {
      onClose();
      return;
    }
    router.push(origin.returnTo);
  };

  const primary = profile.contacts.find((c) => c.isExecutor) ?? profile.contacts[0];

  return (
    <div
      className={cn(
        "space-y-6",
        presentation === "page" ? "mx-auto max-w-6xl p-4 sm:p-6" : "p-4 sm:p-5",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {presentation === "embedded"
              ? `Back to ${closeLabel ?? "previous workspace"}`
              : `Back to ${originLabel}`}
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-teal-500/25 bg-teal-500/10 text-sm font-bold text-teal-900 dark:text-teal-100">
              {initials || <Building2 className="h-5 w-5" />}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">{profile.name}</h1>
                <StatusPill variant="muted">{ELW_FRAMEWORK_VERSION}</StatusPill>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {ELW_OFFICIAL_NAME} · product context · {activeProduct.label}
                {initialProductLabel && initialProductLabel !== activeProduct.label
                  ? ` · opened for ${initialProductLabel}`
                  : ""}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {presentation === "page" && origin.selectionMode ? (
            <Button
              type="button"
              size="sm"
              className="h-9 bg-teal-700 hover:bg-teal-800"
              disabled={busy}
              onClick={onSelectLender}
            >
              Select Lender
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            disabled={!primary?.mobile}
            onClick={() => {
              const tel = primary?.mobile?.replace(/\D/g, "");
              if (tel) window.open(`tel:${tel}`, "_self");
            }}
          >
            <Phone className="h-3.5 w-3.5" />
            Call
          </Button>
          <WorkspacePrimaryActions
            mode="readonly"
            onClose={onBack}
            density="default"
          />
        </div>
      </div>

      {/* SECTION 1 — Overview */}
      <section className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm">
        <h2 className="text-sm font-semibold tracking-tight">Overview</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Basic information
            </p>
            <p className="mt-1 text-sm">{profile.name}</p>
            <p className="text-xs text-muted-foreground">Code · {profile.code}</p>
            <p className="text-xs text-muted-foreground">
              HQ · {profile.headquartersCity ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Coverage
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {(profile.cities.length ? profile.cities : ["Mumbai", "Pune"]).join(" · ")}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Status · Version · Updated
            </p>
            <p className="mt-1 text-xs">
              Relationship · {profile.metrics.relationshipStrength}
            </p>
            <p className="text-xs text-muted-foreground">{ELW_FRAMEWORK_VERSION}</p>
            <p className="text-xs text-muted-foreground">Last updated · 12 Jul 2026</p>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Internal notes
          </p>
          <Textarea
            className="mt-1.5 min-h-[72px] resize-none text-xs"
            placeholder="Internal notes for this lender…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </section>

      {/* SECTION 2 — Products (context switcher) */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Products</h2>
          <p className="text-xs text-muted-foreground">
            Selecting a product changes the entire workspace context below.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {products.map((p) => {
            const active = p.id === activeProduct.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveProductId(p.id)}
                className={cn(
                  "rounded-xl border px-3.5 py-2 text-xs font-medium transition-all",
                  active
                    ? "border-teal-500/50 bg-teal-500/15 text-teal-950 shadow-sm dark:text-teal-50"
                    : "border-border/70 bg-card text-muted-foreground hover:bg-muted/40",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* SECTION 3 — Product Policy placeholders */}
      <section className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <FileText className="h-4 w-4 text-teal-700 dark:text-teal-300" />
          <h2 className="text-sm font-semibold tracking-tight">
            Product Policy · {activeProduct.label}
          </h2>
          <StatusPill variant="muted">Placeholder · Credit Knowledge Framework</StatusPill>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ELW_PRODUCT_POLICY_SECTIONS.map((section) => (
            <div
              key={section.id}
              className="rounded-xl border border-dashed border-border/80 bg-muted/15 p-3.5"
            >
              <p className="text-xs font-semibold">{section.title}</p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                {section.placeholder}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4 — Relationship Hierarchy */}
      <section className="rounded-2xl border border-border/70 bg-gradient-to-b from-card to-muted/20 p-5 shadow-sm">
        <ElwHierarchyChart
          lenderId={lenderId}
          nodes={hierarchy}
          onChanged={() => setHierarchyTick((t) => t + 1)}
        />
      </section>
    </div>
  );
}
