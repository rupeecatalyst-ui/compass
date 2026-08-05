"use client";

/**
 * CO-ID-001 — Contact Profile Roles section (additive business roles).
 */

import { Check, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EnterpriseIdentityRoleAssignment } from "@/types/enterprise-identity-model";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ContactIdentityRolesSection({
  assignments,
  className,
}: {
  assignments: EnterpriseIdentityRoleAssignment[];
  className?: string;
}) {
  return (
    <section
      className={cn(
        "space-y-2 rounded-xl border border-border/70 bg-card p-3",
        className,
      )}
      data-id-model="contact-roles"
      aria-label="Contact business roles"
    >
      <header>
        <h3 className="text-sm font-semibold text-foreground">Roles</h3>
        <p className="text-[11px] text-muted-foreground">
          One Contact · many roles. Roles are additive and never create duplicate identities.
        </p>
      </header>
      <div className="overflow-hidden rounded-lg border border-border/60">
        <table className="w-full text-left text-xs">
          <thead className="border-b bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-2.5 py-1.5 font-medium">Role</th>
              <th className="px-2.5 py-1.5 font-medium">Status</th>
              <th className="px-2.5 py-1.5 font-medium">Assigned Date</th>
              <th className="px-2.5 py-1.5 font-medium">Assigned By</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((row) => (
              <tr key={row.roleId} className="border-b border-border/40 last:border-0">
                <td className="px-2.5 py-2">
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        row.assigned
                          ? "border-emerald-600 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : "border-border text-muted-foreground",
                      )}
                      aria-hidden
                    >
                      {row.assigned ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Square className="h-2.5 w-2.5 opacity-40" />
                      )}
                    </span>
                    <div>
                      <p className="font-medium text-foreground">{row.label}</p>
                      {row.detail ? (
                        <p className="text-[10px] text-muted-foreground">{row.detail}</p>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="px-2.5 py-2 capitalize text-muted-foreground">
                  {row.status === "reserved"
                    ? "Reserved"
                    : row.assigned
                      ? "Assigned"
                      : "Not assigned"}
                </td>
                <td className="px-2.5 py-2 text-muted-foreground">
                  {formatDate(row.assignedDate)}
                </td>
                <td className="px-2.5 py-2 font-mono text-[10px] text-muted-foreground">
                  {row.assignedBy || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
