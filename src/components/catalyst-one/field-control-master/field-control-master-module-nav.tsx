"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GOVERNED_FIELDS_PATH, FIELD_INVENTORY_PATH } from "@/lib/field-control-master/field-inventory-presentation";
import { cn } from "@/lib/utils";

const VIEWS = [
  { href: GOVERNED_FIELDS_PATH, label: "Governed Fields", match: "exact" as const },
  { href: FIELD_INVENTORY_PATH, label: "Field Inventory", match: "prefix" as const },
];

export function FieldControlMasterModuleNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Field Control Master views" className="flex flex-wrap gap-2">
      {VIEWS.map((view) => {
        const active = view.match === "exact" ? pathname === view.href : pathname === view.href || pathname.startsWith(`${view.href}/`);
        return (
          <Link
            key={view.href}
            href={view.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium",
              active
                ? "border-border bg-accent text-accent-foreground"
                : "border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {view.label}
          </Link>
        );
      })}
    </nav>
  );
}
