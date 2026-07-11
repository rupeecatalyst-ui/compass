"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { HlChapter } from "@/components/home-loan-experience/hl-chapter";
import { cn } from "@/lib/utils";

const DOCUMENT_GROUPS = [
  {
    id: "identity",
    label: "Identity",
    items: ["PAN & Aadhaar", "Photograph", "Address proof"],
  },
  {
    id: "income",
    label: "Income",
    items: ["Salary slips or ITR", "Bank statements", "Employment proof"],
  },
  {
    id: "property",
    label: "Property",
    items: ["Agreement to sell", "Property papers", "NOC if applicable"],
  },
  {
    id: "bank",
    label: "Bank",
    items: ["Cancelled cheque", "Existing loan statements"],
  },
] as const;

export function HlDocumentsCompact() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <HlChapter id="documents" className="border-t border-white/[0.04] py-14 sm:py-16">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Documentation</p>
        <h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">You&apos;re covered</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;ll guide you through every document when it&apos;s needed.
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-md space-y-2">
        {DOCUMENT_GROUPS.map((group) => {
          const open = openId === group.id;
          return (
            <div key={group.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : group.id)}
                className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-medium text-foreground"
              >
                {group.label}
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
              </button>
              {open ? (
                <ul className="border-t border-white/[0.04] px-4 py-3 text-sm text-muted-foreground">
                  {group.items.map((item) => (
                    <li key={item} className="py-1">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
    </HlChapter>
  );
}
