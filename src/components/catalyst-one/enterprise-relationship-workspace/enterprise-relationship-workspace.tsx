"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, Plus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ERW_COLOUR_FAMILIES,
  ERW_COLOUR_FAMILY_TOKENS,
  ERW_ENTITY_TYPES,
  ERW_ENTITY_TYPE_LABELS,
  ERW_RELATIONSHIP_STATUSES,
  ERW_RELATIONSHIP_STATUS_LABELS,
  getEnabledErwRelationshipTypes,
  type ErwColourFamily,
  type ErwEntityType,
  type ErwRelationshipStatus,
} from "@/constants/enterprise-relationship-workspace";
import {
  buildContactRelationshipGraph,
  filterErwGraphModel,
} from "@/lib/enterprise-relationship-workspace";
import { cn } from "@/lib/utils";
import type { EcmContact } from "@/types/enterprise-contact-master";
import {
  ERW_EMPTY_FILTERS,
  type ErwGraphFilters,
} from "@/types/enterprise-relationship-workspace";
import { EnterpriseRelationshipGraph } from "./enterprise-relationship-graph";
import { ErwRelationshipDetailsPanel } from "./erw-relationship-details-panel";
import { ErwRelationshipGrid } from "./erw-relationship-grid";

export interface EnterpriseRelationshipWorkspaceProps {
  contact: EcmContact;
  onAddRelationship?: () => void;
  className?: string;
}

function toggleInList<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function EnterpriseRelationshipWorkspace({
  contact,
  onAddRelationship,
  className,
}: EnterpriseRelationshipWorkspaceProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<ErwGraphFilters>(ERW_EMPTY_FILTERS);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const baseModel = useMemo(() => buildContactRelationshipGraph(contact), [contact]);
  const model = useMemo(
    () => filterErwGraphModel(baseModel, filters),
    [baseModel, filters],
  );

  useEffect(() => {
    setSelectedNodeId(baseModel.centreNodeId);
  }, [contact.id, baseModel.centreNodeId]);

  const selected =
    model.nodes.find((n) => n.id === selectedNodeId) ??
    model.nodes.find((n) => n.isCentre) ??
    null;

  const types = getEnabledErwRelationshipTypes();

  return (
    <div className={cn("flex min-h-full flex-1 flex-col space-y-3", className)}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-400/90">
            Enterprise Relationship Workspace
          </p>
          <p className="text-[11px] text-zinc-500">
            Explicit Relationship Registry for {contact.name} · never inferred from roles or
            mappings
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            className="h-7 gap-1 rounded-md bg-teal-600 px-2.5 text-xs text-white hover:bg-teal-500"
            onClick={onAddRelationship}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Relationship
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 border-zinc-700 bg-zinc-900 px-2 text-xs"
            onClick={() => setShowFilters((v) => !v)}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 border-zinc-700 bg-zinc-900 px-2 text-xs"
            aria-label="More actions"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
            More
          </Button>
        </div>
      </div>

      {baseModel.tickerHints[0] && (
        <p className="rounded-lg border border-teal-900/50 bg-teal-950/30 px-2.5 py-1.5 text-[11px] text-teal-200/90">
          CHANAKYA · {baseModel.tickerHints[0]}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          placeholder="Search relationships…"
          className="h-8 max-w-xs border-zinc-700 bg-zinc-950 text-xs"
        />
        {(Object.keys(ERW_COLOUR_FAMILIES) as ErwColourFamily[]).map((family) => {
          const tone = ERW_COLOUR_FAMILY_TOKENS[family];
          const active = filters.colourFamilies.includes(family);
          return (
            <button
              key={family}
              type="button"
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  colourFamilies: toggleInList(f.colourFamilies, family),
                }))
              }
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition",
                active ? "ring-1 ring-offset-0" : "opacity-80 hover:opacity-100",
              )}
              style={{
                borderColor: tone.ring,
                color: tone.text,
                background: tone.soft,
              }}
            >
              {tone.label}
            </button>
          );
        })}
      </div>

      {showFilters && (
        <div className="grid gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 md:grid-cols-3">
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              Relationship Type
            </p>
            <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto">
              {types.map((t) => {
                const active = filters.relationshipTypeCodes.includes(t.code);
                return (
                  <button
                    key={t.code}
                    type="button"
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        relationshipTypeCodes: toggleInList(f.relationshipTypeCodes, t.code),
                      }))
                    }
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px]",
                      active
                        ? "border-teal-600 bg-teal-950/50 text-teal-200"
                        : "border-zinc-700 text-zinc-400 hover:text-zinc-200",
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              Entity Type
            </p>
            <div className="flex flex-wrap gap-1">
              {(Object.values(ERW_ENTITY_TYPES) as ErwEntityType[]).map((type) => {
                const active = filters.entityTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        entityTypes: toggleInList(f.entityTypes, type),
                      }))
                    }
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px]",
                      active
                        ? "border-teal-600 bg-teal-950/50 text-teal-200"
                        : "border-zinc-700 text-zinc-400 hover:text-zinc-200",
                    )}
                  >
                    {ERW_ENTITY_TYPE_LABELS[type]}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              Status
            </p>
            <div className="flex flex-wrap gap-1">
              {(Object.values(ERW_RELATIONSHIP_STATUSES) as ErwRelationshipStatus[]).map(
                (status) => {
                  const active = filters.statuses.includes(status);
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() =>
                        setFilters((f) => ({
                          ...f,
                          statuses: toggleInList(f.statuses, status),
                        }))
                      }
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px]",
                        active
                          ? "border-teal-600 bg-teal-950/50 text-teal-200"
                          : "border-zinc-700 text-zinc-400 hover:text-zinc-200",
                      )}
                    >
                      {ERW_RELATIONSHIP_STATUS_LABELS[status]}
                    </button>
                  );
                },
              )}
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="mt-2 h-7 px-2 text-[11px] text-zinc-400"
              onClick={() => setFilters(ERW_EMPTY_FILTERS)}
            >
              Clear filters
            </Button>
          </div>
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,7fr)_minmax(260px,3fr)]">
        <div className="flex min-h-[min(52vh,420px)] flex-col rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
          <EnterpriseRelationshipGraph
            nodes={model.nodes}
            edges={model.edges}
            centreNodeId={model.centreNodeId}
            selectedNodeId={selected?.id ?? null}
            onSelectNode={setSelectedNodeId}
            collapsed={collapsed}
            onCollapsedChange={setCollapsed}
            onAddRelationship={onAddRelationship}
            className="min-h-0 flex-1"
          />
        </div>
        <ErwRelationshipDetailsPanel
          node={selected}
          onNavigateLinked={(href) => router.push(href)}
        />
      </div>

      <ErwRelationshipGrid
        nodes={model.nodes}
        selectedNodeId={selected?.id ?? null}
        onSelectNode={setSelectedNodeId}
        onOpenNode={(node) => {
          setSelectedNodeId(node.id);
          if (node.navigateWorkspace === "loan") router.push("/my-deals");
          else if (node.navigateWorkspace === "opportunity") router.push("/opportunities");
          else if (node.navigateWorkspace === "lender") router.push("/lenders");
        }}
      />
    </div>
  );
}
