"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OwGlassPanel, OwPanelHeader } from "./workspace-design";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";

interface DeviationEntry {
  id: string;
  text: string;
  createdAt: string;
}

interface MitigantEntry {
  id: string;
  text: string;
  createdAt: string;
}

const STORAGE_KEY = "catalyst.strategic.deviation-mitigant";

function loadBundle(opportunityId: string): {
  deviations: DeviationEntry[];
  mitigants: MitigantEntry[];
} {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${opportunityId}`);
    if (!raw) return { deviations: [], mitigants: [] };
    const parsed = JSON.parse(raw) as {
      deviations?: DeviationEntry[];
      mitigants?: MitigantEntry[];
    };
    return {
      deviations: parsed.deviations ?? [],
      mitigants: parsed.mitigants ?? [],
    };
  } catch {
    return { deviations: [], mitigants: [] };
  }
}

function saveBundle(
  opportunityId: string,
  bundle: { deviations: DeviationEntry[]; mitigants: MitigantEntry[] },
) {
  localStorage.setItem(`${STORAGE_KEY}:${opportunityId}`, JSON.stringify(bundle));
}

/**
 * Phase 1 — manual Deviation & Mitigant capture (RM observations only).
 * No auto-detect engine.
 */
export function WorkspaceDeviationMitigantPanel() {
  const { opportunityId } = useOpportunityWorkspace();
  const [deviations, setDeviations] = useState<DeviationEntry[]>([]);
  const [mitigants, setMitigants] = useState<MitigantEntry[]>([]);
  const [devDraft, setDevDraft] = useState("");
  const [mitDraft, setMitDraft] = useState("");

  useEffect(() => {
    if (!opportunityId) return;
    const bundle = loadBundle(opportunityId);
    setDeviations(bundle.deviations);
    setMitigants(bundle.mitigants);
  }, [opportunityId]);

  const persist = (nextDev: DeviationEntry[], nextMit: MitigantEntry[]) => {
    if (!opportunityId) return;
    setDeviations(nextDev);
    setMitigants(nextMit);
    saveBundle(opportunityId, { deviations: nextDev, mitigants: nextMit });
  };

  const addDeviation = () => {
    const text = devDraft.trim();
    if (!text || !opportunityId) return;
    const next = [
      {
        id: `dev-${Date.now()}`,
        text,
        createdAt: new Date().toISOString(),
      },
      ...deviations,
    ];
    persist(next, mitigants);
    setDevDraft("");
  };

  const addMitigant = () => {
    const text = mitDraft.trim();
    if (!text || !opportunityId) return;
    const next = [
      {
        id: `mit-${Date.now()}`,
        text,
        createdAt: new Date().toISOString(),
      },
      ...mitigants,
    ];
    persist(deviations, next);
    setMitDraft("");
  };

  return (
    <div className="space-y-4">
      <OwGlassPanel>
        <OwPanelHeader
          title="Deviation & Mitigant"
          badge="Manual"
          description="Capture RM observations for policy deviations and mitigants. Auto-detection is deferred."
        />
      </OwGlassPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <OwGlassPanel className="!p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Deviations
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Policy or underwriting exceptions observed on this opportunity.
          </p>
          <div className="mt-3 space-y-2">
            <textarea
              value={devDraft}
              onChange={(e) => setDevDraft(e.target.value)}
              placeholder="e.g. FOIR exceeds program guideline by ~4%"
              className="min-h-[72px] w-full resize-none rounded-md border border-white/10 bg-zinc-950/50 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40"
            />
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={addDeviation}
              disabled={!devDraft.trim()}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Deviation
            </Button>
          </div>
          <ul className="mt-3 space-y-2">
            {deviations.length === 0 && (
              <li className="rounded-lg border border-dashed border-white/15 px-3 py-4 text-center text-xs text-zinc-500">
                No deviations captured yet. Add the first observation to begin the record.
              </li>
            )}
            {deviations.map((d) => (
              <li
                key={d.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-white/10 bg-zinc-950/45 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-xs leading-relaxed text-zinc-100">{d.text}</p>
                  <p className="mt-1 text-[10px] text-zinc-500">
                    {new Date(d.createdAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 text-zinc-400 hover:text-rose-300"
                  onClick={() => persist(
                    deviations.filter((x) => x.id !== d.id),
                    mitigants,
                  )}
                  aria-label="Remove deviation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </OwGlassPanel>

        <OwGlassPanel className="!p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Mitigants
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Compensating factors the RM will present alongside each deviation.
          </p>
          <div className="mt-3 space-y-2">
            <Input
              value={mitDraft}
              onChange={(e) => setMitDraft(e.target.value)}
              placeholder="e.g. Additional guarantor + escrowed EMI buffer"
              className="h-9 border-white/10 bg-zinc-950/50 text-xs text-zinc-100"
              onKeyDown={(e) => {
                if (e.key === "Enter") addMitigant();
              }}
            />
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={addMitigant}
              disabled={!mitDraft.trim()}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Mitigant
            </Button>
          </div>
          <ul className="mt-3 space-y-2">
            {mitigants.length === 0 && (
              <li className="rounded-lg border border-dashed border-white/15 px-3 py-4 text-center text-xs text-zinc-500">
                No mitigants recorded. Pair each deviation with a clear compensating factor.
              </li>
            )}
            {mitigants.map((m) => (
              <li
                key={m.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-white/10 bg-zinc-950/45 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-xs leading-relaxed text-zinc-100">{m.text}</p>
                  <p className="mt-1 text-[10px] text-zinc-500">
                    {new Date(m.createdAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 text-zinc-400 hover:text-rose-300"
                  onClick={() => persist(
                    deviations,
                    mitigants.filter((x) => x.id !== m.id),
                  )}
                  aria-label="Remove mitigant"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </OwGlassPanel>
      </div>
    </div>
  );
}
