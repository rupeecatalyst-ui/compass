"use client";

import { useEffect, useMemo, useState } from "react";
import { buildChanakyaProgrammeEvidence } from "@/lib/product-programme-operations/chanakya-evidence";
import { mergeEdieAndProgrammeLod } from "@/lib/product-programme-operations/lod-merge";
import { readDealProgrammeStamp } from "@/lib/product-programme-operations/deal-stamp";
import { lenderRegistryClient } from "@/lib/enterprise-lender-registry";
import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";
import { cn } from "@/lib/utils";

export function useLivePublishedProgrammes(lenderId?: string | null) {
  const [programs, setPrograms] = useState<EnterpriseLenderProgramRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void lenderRegistryClient
      .queryPrograms({
        lenderId: lenderId || undefined,
        publishedOnly: true,
        pageSize: 50,
      })
      .then((result) => {
        if (cancelled) return;
        const items = [...(result.items ?? [])].sort((a, b) => {
          const tb = Date.parse(b.updatedAt || "") || 0;
          const ta = Date.parse(a.updatedAt || "") || 0;
          if (tb !== ta) return tb - ta;
          return (b.versionNumber ?? 0) - (a.versionNumber ?? 0);
        });
        setPrograms(items);
      })
      .catch(() => {
        if (!cancelled) setPrograms([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lenderId]);

  return { programs, loading, program: programs[0] ?? null };
}

export function PublishedProgrammeEvidence({
  program,
  stamp,
  title = "Published programme",
  className,
}: {
  program?: EnterpriseLenderProgramRecord | null;
  stamp?: ReturnType<typeof readDealProgrammeStamp>;
  title?: string;
  className?: string;
}) {
  const evidence = useMemo(() => buildChanakyaProgrammeEvidence(program ?? null), [program]);
  const code = stamp?.programmeCode || evidence.programmeCode;
  const version = stamp?.programmeVersion ?? evidence.programmeVersion;
  const roi = stamp?.roiRange ?? evidence.citation?.roiRange ?? null;

  return (
    <section
      data-testid="published-programme-evidence"
      className={cn(
        "rounded-lg border border-border/60 bg-card/80 px-3 py-2",
        className,
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {code && version != null ? (
        <>
          <p className="mt-1 text-sm font-medium text-foreground" data-testid="published-programme-version">
            {code} v{version}
            {roi ? ` · ROI ${roi}` : ""}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{evidence.reason}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Policy · {evidence.policyLabel}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Documents · {evidence.documentLabel}
          </p>
        </>
      ) : (
        <p className="mt-1 text-[11px] text-muted-foreground">{evidence.reason}</p>
      )}
    </section>
  );
}

export function ProgrammeLodOverlayBanner({
  program,
  edieTypeRefs = [],
  className,
}: {
  program?: EnterpriseLenderProgramRecord | null;
  edieTypeRefs?: string[];
  className?: string;
}) {
  const overlay = useMemo(
    () =>
      mergeEdieAndProgrammeLod({ edieTypeRefs, program }).filter(
        (item) => item.source === "programme_overlay",
      ),
    [edieTypeRefs, program],
  );
  if (!program) {
    return (
      <p
        data-testid="programme-lod-overlay"
        className={cn("text-[11px] text-muted-foreground", className)}
      >
        No published programme LOD overlay.
      </p>
    );
  }
  return (
    <section
      data-testid="programme-lod-overlay"
      className={cn(
        "rounded-lg border border-border/60 bg-card/80 px-3 py-2",
        className,
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Programme LOD overlay
      </p>
      <p className="mt-1 text-[11px] text-foreground">
        {program.code} v{program.versionNumber} overlays EDIE with {overlay.length} required
        document{overlay.length === 1 ? "" : "s"}.
      </p>
      {overlay.length > 0 ? (
        <ul className="mt-1 list-disc pl-4 text-[11px] text-muted-foreground">
          {overlay.slice(0, 8).map((item) => (
            <li key={item.typeRef}>
              {item.label}
              {item.mandatory ? " · mandatory" : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
