"use client";

/**
 * CO-MARKETING-REDESIGN-021 — Shared pagination control for Marketing registries.
 */

import { Button } from "@/components/ui/button";

export function MarketingUxPagination(props: {
  page: number;
  totalPages: number;
  total: number;
  label: string;
  onPageChange: (page: number) => void;
}) {
  if (props.total <= 0) return null;
  return (
    <nav className="mkt-ux-pager" aria-label={props.label}>
      <p className="text-sm text-muted-foreground">
        Page {props.page} of {props.totalPages} · {props.total} items
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={props.page <= 1}
          onClick={() => props.onPageChange(props.page - 1)}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={props.page >= props.totalPages}
          onClick={() => props.onPageChange(props.page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
