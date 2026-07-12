"use client";

import type {
  MissionControlSecurityContext,
  MissionControlSecurityGateway,
} from "../security";

/**
 * Security Gateway wrapper — placeholder evaluation only.
 * Does not change Catalyst One authentication.
 */
export function McSecurityGateway({
  gateway,
  context,
  children,
}: {
  gateway: MissionControlSecurityGateway;
  context: Partial<MissionControlSecurityContext>;
  children: React.ReactNode;
}) {
  const result = gateway.evaluate(context);

  if (!result.allowed) {
    return (
      <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-100">
        <p className="font-semibold uppercase tracking-wide text-rose-200">Access gated</p>
        <p className="mt-2 text-rose-100/80">{result.reason ?? "Security check failed"}</p>
        <p className="mt-4 text-[11px] text-rose-200/60">
          Mission Control Security Gateway placeholder — SPR-007.1
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
