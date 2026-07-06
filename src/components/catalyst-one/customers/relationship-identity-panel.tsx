"use client";

import { Check, X } from "lucide-react";
import { EntityButtonLink, EntityLink } from "@/components/catalyst-one/shared/entity-link";
import { getProductColor } from "@/constants/product-colors";
import { CustomerHealthBadge } from "@/components/catalyst-one/customers/customer-health-badge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  HealthReason,
  OrganizationAffiliationDisplay,
  PersonalRelationshipDisplay,
} from "@/lib/customer-utils";
import type { CustomerProfile } from "@/types/catalyst-one";

interface RelationshipIdentityPanelProps {
  customer: CustomerProfile;
  businessRoles: string[];
  organizationAffiliations: OrganizationAffiliationDisplay[];
  personalRelationships: PersonalRelationshipDisplay[];
  productLines: string[];
  healthReasons: HealthReason[];
  onOpenContact?: (contactId: string) => void;
}

/** CRC-009 — Relationship identity at a glance. */
export function RelationshipIdentityPanel({
  customer,
  businessRoles,
  organizationAffiliations,
  personalRelationships,
  productLines,
  healthReasons,
  onOpenContact,
}: RelationshipIdentityPanelProps) {
  return (
    <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground">Relationship Identity</h4>
        <CustomerHealthBadge health={customer.health} />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <Section title="Business Roles">
          <div className="flex flex-wrap gap-1">
            {businessRoles.map((role) => (
              <Badge key={role} variant="secondary" className="h-5 text-[10px]">
                {role}
              </Badge>
            ))}
          </div>
        </Section>

        <Section title="Organization Affiliations">
          <ul className="space-y-1.5">
            {organizationAffiliations.map((a, i) => (
              <li key={`${a.organization}-${i}`}>
                {a.contactId && onOpenContact ? (
                  <EntityButtonLink
                    label={a.organization}
                    onClick={() => onOpenContact(a.contactId!)}
                    className="text-xs font-medium"
                  />
                ) : (
                  <EntityLink
                    type="company"
                    id={a.organization}
                    label={a.organization}
                    className="text-xs font-medium"
                  />
                )}
                <p className="text-muted-foreground">
                  {a.role}
                  {a.isPrimary && (
                    <span className="ml-1 text-primary">· Primary</span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Personal Relationships">
          {personalRelationships.length === 0 ? (
            <p className="text-muted-foreground">—</p>
          ) : (
            <ul className="space-y-1.5">
              {personalRelationships.map((r) => (
                <li key={r.name}>
                  {r.contactId && onOpenContact ? (
                    <EntityButtonLink
                      label={r.name}
                      onClick={() => onOpenContact(r.contactId!)}
                    />
                  ) : (
                    <span className="font-medium">{r.name}</span>
                  )}
                  <p className="text-muted-foreground capitalize">{r.relationship}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Product Engagements">
          <div className="flex flex-wrap gap-1">
            {productLines.length === 0 ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              productLines.map((p, i) => (
                <Badge
                  key={p}
                  variant="outline"
                  className="h-5 text-[10px] border"
                  style={{
                    borderColor: getProductColor(p, i),
                    color: getProductColor(p, i),
                  }}
                >
                  {p}
                </Badge>
              ))
            )}
            <Badge variant="outline" className="h-5 text-[10px] opacity-50">
              MF · future
            </Badge>
            <Badge variant="outline" className="h-5 text-[10px] opacity-50">
              Insurance · future
            </Badge>
          </div>
        </Section>
      </div>

      <div className="border-t border-border pt-3">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
          Relationship Score {customer.relationshipScore}/100 — Why
        </p>
        <ul className="flex flex-wrap gap-2">
          {healthReasons.map((r) => (
            <li
              key={r.label}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px]",
                r.impact === "positive" && "border-success/30 text-success bg-success/5",
                r.impact === "negative" && "border-destructive/30 text-destructive bg-destructive/5",
                r.impact === "neutral" && "border-border text-muted-foreground",
              )}
            >
              {r.impact === "positive" ? (
                <Check className="h-3 w-3" />
              ) : r.impact === "negative" ? (
                <X className="h-3 w-3" />
              ) : null}
              {r.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">{title}</p>
      {children}
    </div>
  );
}
