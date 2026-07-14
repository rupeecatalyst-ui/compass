"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { buildElwWorkspaceHref, normalizeLenderId } from "@/constants/enterprise-lender-workspace";

type EntityType = "customer" | "loan" | "lender" | "company" | "task" | "document";

interface EntityLinkProps {
  type: EntityType;
  id: string;
  label: string;
  className?: string;
  onNavigate?: () => void;
}

function hrefFor(type: EntityType, id: string): string {
  switch (type) {
    case "customer":
      return `/customers?customer=${id}`;
    case "loan":
      return `/pipeline?file=${id}`;
    case "lender":
      return buildElwWorkspaceHref(normalizeLenderId(id), {
        from: "search",
        returnTo: "/lenders",
      });
    case "company":
      return `/customers?company=${encodeURIComponent(id)}`;
    case "task":
      return `/tasks?task=${id}`;
    case "document":
      return `/documents?doc=${id}`;
    default:
      return "#";
  }
}

/** CRC-008 — Connected intelligence navigation. */
export function EntityLink({ type, id, label, className, onNavigate }: EntityLinkProps) {
  return (
    <Link
      href={hrefFor(type, id)}
      onClick={onNavigate}
      className={cn(
        "text-primary hover:underline font-medium inline-flex items-center gap-0.5",
        className,
      )}
    >
      {label}
    </Link>
  );
}

interface EntityButtonLinkProps {
  label: string;
  className?: string;
  onClick: () => void;
}

/** In-workspace navigation without route change (context preservation). */
export function EntityButtonLink({ label, className, onClick }: EntityButtonLinkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-primary hover:underline font-medium text-left",
        className,
      )}
    >
      {label}
    </button>
  );
}
