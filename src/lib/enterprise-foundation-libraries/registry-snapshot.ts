/**
 * CF-EFL-001 — Registry snapshot & admin helpers.
 */

import {
  EFL_ARCHITECTURE_FREEZE_NOTE,
  EFL_FRAMEWORK_VERSION,
  getEnabledEflLibraries,
} from "@/constants/enterprise-foundation-libraries";
import type {
  EflLibraryCode,
  EflLibraryEntry,
  EflLibraryStats,
  EflRegistrySnapshot,
} from "@/types/enterprise-foundation-libraries";
import { createEflEntryRepository } from "./repositories/in-memory";

export function getEflFrameworkVersion(): string {
  return EFL_FRAMEWORK_VERSION;
}

export function buildEflLibraryStats(libraryCode: EflLibraryCode): EflLibraryStats {
  const def = getEnabledEflLibraries().find((l) => l.libraryCode === libraryCode);
  const entries = createEflEntryRepository().list(libraryCode);
  const active = entries.filter((e) => e.status === "active").length;
  const inactive = entries.filter((e) => e.status === "inactive").length;
  const target = def?.targetEntryCount ?? entries.length;
  return {
    libraryCode,
    total: entries.length,
    active,
    inactive,
    targetEntryCount: target,
    populationPct: target > 0 ? Math.round((entries.length / target) * 1000) / 10 : 0,
  };
}

export function getEflRegistrySnapshot(): EflRegistrySnapshot {
  const libraries = getEnabledEflLibraries();
  const repo = createEflEntryRepository();
  const all = repo.list();
  return {
    frameworkVersion: EFL_FRAMEWORK_VERSION,
    frozenAt: "2026-07-14",
    libraries,
    stats: libraries.map((l) => buildEflLibraryStats(l.libraryCode)),
    entryCount: all.length,
    architectureNote: EFL_ARCHITECTURE_FREEZE_NOTE,
  };
}

export function setEflEntryStatus(
  id: string,
  status: EflLibraryEntry["status"],
  actor = "admin",
): EflLibraryEntry | undefined {
  const repo = createEflEntryRepository();
  const existing = repo.findById(id);
  if (!existing) return undefined;
  const next: EflLibraryEntry = {
    ...existing,
    status,
    modifiedBy: actor,
    modifiedOn: new Date().toISOString(),
  };
  repo.save(next);
  return next;
}
