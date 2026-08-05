/**
 * CO-TASKS-PLANNER-001A — Planner seed is ETE-only (no parallel Meeting/Reminder task stores).
 * Ensures Enterprise Task Registry has operational activities for BAT.
 */

import { ensureEnterpriseTasksDemoSeed } from "@/lib/enterprise-task-engine";

/**
 * @deprecated Prefer ensureEnterpriseTasksDemoSeed — Planner never seeds a second task store.
 */
export function ensurePlannerOperationalSeed(): void {
  ensureEnterpriseTasksDemoSeed();
}
