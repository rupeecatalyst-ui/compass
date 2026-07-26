/**
 * CO-OPS-002 — Client fetch for System Health (Observability / Alert Center).
 */

import { getAccessToken } from "@/lib/api-client";
import type { OpsHealthSnapshot } from "@/types/ops-observability";

export async function fetchOpsHealthClient(): Promise<OpsHealthSnapshot | null> {
  if (typeof window === "undefined") return null;
  const token = getAccessToken();
  if (!token) return null;
  try {
    const res = await fetch("/api/admin/ops-health", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      success?: boolean;
      data?: OpsHealthSnapshot;
    };
    if (!body.success || !body.data) return null;
    return body.data;
  } catch {
    return null;
  }
}
