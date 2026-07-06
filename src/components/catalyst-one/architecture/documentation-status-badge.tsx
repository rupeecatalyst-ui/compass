"use client";

import {
  DOCUMENTATION_STATUS_LABELS,
  DOCUMENTATION_STATUS_VARIANT,
} from "@/constants/enterprise-architecture";
import type { DocumentationStatus } from "@/types/enterprise-architecture";
import { StatusPill } from "@/components/design-system/status-pill";

export function DocumentationStatusBadge({ status }: { status: DocumentationStatus }) {
  return (
    <StatusPill variant={DOCUMENTATION_STATUS_VARIANT[status]}>
      {DOCUMENTATION_STATUS_LABELS[status]}
    </StatusPill>
  );
}
