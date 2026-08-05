"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  Download,
  MoreHorizontal,
  Pencil,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  erwColourToken,
  erwEntityTypeLabel,
  erwExportCsv,
  erwStatusLabel,
} from "@/lib/enterprise-relationship-workspace";
import { cn } from "@/lib/utils";
import type { ErwGraphNode } from "@/types/enterprise-relationship-workspace";

type SortKey = "name" | "relationship" | "entity" | "status" | "since";

export interface ErwRelationshipGridProps {
  nodes: ErwGraphNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onOpenNode?: (node: ErwGraphNode) => void;
  className?: string;
}

export function ErwRelationshipGrid({
  nodes,
  selectedNodeId,
  onSelectNode,
  onOpenNode,
  className,
}: ErwRelationshipGridProps) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [localSearch, setLocalSearch] = useState("");

  const rows = useMemo(() => {
    const q = localSearch.trim().toLowerCase();
    let list = nodes.filter((n) => !n.isCentre);
    if (q) {
      list = list.filter((n) =>
        `${n.name} ${n.relationshipTypeLabel} ${n.entityType}`.toLowerCase().includes(q),
      );
    }
    list = [...list].sort((a, b) => {
      const av =
        sortKey === "name"
          ? a.name
          : sortKey === "relationship"
            ? a.relationshipTypeLabel
            : sortKey === "entity"
              ? a.entityType
              : sortKey === "status"
                ? a.status
                : a.detail.dateSince ?? "";
      const bv =
        sortKey === "name"
          ? b.name
          : sortKey === "relationship"
            ? b.relationshipTypeLabel
            : sortKey === "entity"
              ? b.entityType
              : sortKey === "status"
                ? b.status
                : b.detail.dateSince ?? "";
      const cmp = String(av).localeCompare(String(bv), "en", { sensitivity: "base" });
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [nodes, localSearch, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const exportCsv = () => {
    const csv = erwExportCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "enterprise-relationships.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section
      className={cn(
        "rounded-xl border border-zinc-800 bg-zinc-900/50",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 px-3 py-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Relationship Grid
          </p>
          <p className="text-[11px] text-zinc-500">{rows.length} relationships</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <Input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search grid…"
              className="h-7 w-44 border-zinc-700 bg-zinc-950 pl-7 text-xs"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 border-zinc-700 bg-zinc-900 px-2 text-[11px]"
            onClick={exportCsv}
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-xs">
          <thead className="bg-zinc-950/80 text-[10px] uppercase tracking-[0.1em] text-zinc-500">
            <tr>
              {(
                [
                  ["name", "Name"],
                  ["relationship", "Relationship Type"],
                  ["entity", "Entity Type"],
                  ["status", "Status"],
                  ["since", "Since"],
                ] as const
              ).map(([key, label]) => (
                <th key={key} className="px-3 py-2 font-medium">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-zinc-200"
                    onClick={() => toggleSort(key)}
                  >
                    {label}
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </button>
                </th>
              ))}
              <th className="px-3 py-2 font-medium">Linked Records</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-zinc-500">
                  No relationships have been defined for this contact.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const tone = erwColourToken(row.colourFamily);
              const selected = selectedNodeId === row.id;
              const linked = row.linkedRecords
                .filter((r) => r.count > 0)
                .map((r) => `${r.label} ${r.count}`)
                .join(" · ");
              return (
                <tr
                  key={row.id}
                  className={cn(
                    "border-t border-zinc-800/80 transition hover:bg-zinc-900",
                    selected && "bg-teal-950/25",
                  )}
                  onClick={() => onSelectNode(row.id)}
                >
                  <td className="px-3 py-2">
                    <p className="font-medium text-zinc-100">{row.name}</p>
                    {row.isIllustrative && (
                      <p className="text-[10px] text-zinc-500">Preview node</p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="inline-flex rounded-full border px-2 py-0.5 text-[10px]"
                      style={{
                        borderColor: tone.ring,
                        color: tone.text,
                        background: tone.soft,
                      }}
                    >
                      {row.relationshipTypeLabel}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-zinc-300">
                    {erwEntityTypeLabel(row.entityType)}
                  </td>
                  <td className="px-3 py-2 text-zinc-300">{erwStatusLabel(row.status)}</td>
                  <td className="px-3 py-2 tabular-nums text-zinc-400">
                    {row.detail.dateSince ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-zinc-400">{linked || "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px] text-zinc-300"
                        onClick={() => onOpenNode?.(row)}
                      >
                        Open
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px] text-zinc-400"
                        onClick={() => onSelectNode(row.id)}
                      >
                        <Pencil className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px] text-zinc-400"
                        onClick={() => onSelectNode(row.id)}
                      >
                        Timeline
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-1.5 text-zinc-500"
                        aria-label="More actions"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
