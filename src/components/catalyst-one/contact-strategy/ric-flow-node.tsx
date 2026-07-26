"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ERW_COLOUR_FAMILY_TOKENS } from "@/constants/enterprise-relationship-workspace";
import { cn } from "@/lib/utils";
import type { RicContact } from "@/lib/contact-strategy/ric-types";

export type RicFlowNodeData = {
  contact: RicContact;
  isCentre: boolean;
};

function RicNodeComponent({ data, selected }: NodeProps) {
  const { contact, isCentre } = data as RicFlowNodeData;
  const tone = ERW_COLOUR_FAMILY_TOKENS[contact.colourFamily];

  return (
    <div
      className={cn(
        "group relative w-[168px] rounded-xl border px-3 py-2.5 shadow-lg transition-transform duration-300",
        isCentre ? "scale-105 ring-2" : "hover:scale-[1.02]",
        selected && "ring-2",
      )}
      style={{
        background: "rgba(15, 23, 42, 0.95)",
        borderColor: tone.ring,
        boxShadow: `0 0 0 1px ${tone.soft}, 0 12px 28px rgba(0,0,0,0.35)`,
        outlineColor: tone.hex,
      }}
      title={[
        `Last Meeting: ${contact.lastMeeting ?? "—"}`,
        `Last Call: ${contact.lastCall ?? "—"}`,
        `Last Follow-up: ${contact.lastFollowUp ?? "—"}`,
      ].join("\n")}
    >
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-slate-500" />
      <div
        className="mb-1.5 h-1 w-10 rounded-full"
        style={{ background: tone.hex }}
        aria-hidden
      />
      <p className="truncate text-[12px] font-semibold leading-tight text-slate-50">{contact.name}</p>
      <p className="mt-0.5 truncate text-[10px] font-medium" style={{ color: tone.text }}>
        {contact.category}
      </p>
      <p className="mt-0.5 truncate text-[10px] text-slate-400">{contact.businessRole}</p>
      <p className="mt-1.5 text-[10px] font-semibold tabular-nums text-slate-200">
        Score · {contact.relationshipScore}
      </p>

      {/* Hover tooltip */}
      <div
        className={cn(
          "pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-44 -translate-x-1/2 rounded-lg border border-white/10 bg-zinc-950/95 px-2.5 py-2 opacity-0 shadow-xl transition-opacity duration-200",
          "group-hover:opacity-100",
        )}
      >
        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Activity</p>
        <ul className="mt-1 space-y-0.5 text-[10px] text-slate-300">
          <li>Last Meeting · {contact.lastMeeting ?? "—"}</li>
          <li>Last Call · {contact.lastCall ?? "—"}</li>
          <li>Last Follow-up · {contact.lastFollowUp ?? "—"}</li>
        </ul>
      </div>

      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-slate-500" />
    </div>
  );
}

export const RicFlowNode = memo(RicNodeComponent);
