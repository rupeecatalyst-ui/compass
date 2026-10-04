/**
 * CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014C
 * Durable Postgres upload-portal rate limiter. In-memory remains first-line only.
 */
import "server-only";

import { prisma } from "@server/lib/prisma";
import {
  consumeUploadPortalRateLimit,
  uploadPortalRateLimitWindowStart,
} from "@/lib/document-workspace/upload-portal-rate-limit";
import { appendDocumentWorkspaceAuditBestEffort } from "@server/services/document-workspace/document-workspace-audit.service";
import { DOCUMENT_WORKSPACE_AUDIT_ACTIONS } from "@/constants/document-workspace-audit";
import { DOCUMENT_WORKSPACE_AUDIT_ACTOR_SYSTEM } from "@/constants/document-workspace-audit";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 30;

export type DurableRateLimitResult = {
  allowed: boolean;
  retryAfterMs: number;
  count: number;
};

function windowStartFor(nowMs: number, windowMs: number): Date {
  return new Date(uploadPortalRateLimitWindowStart(nowMs, windowMs));
}

export async function consumeDurableUploadPortalRateLimit(input: {
  hashedBucket: string;
  organizationId?: string | null;
  maxAttempts?: number;
  windowMs?: number;
  correlationId?: string | null;
}): Promise<DurableRateLimitResult> {
  const hashedBucket = input.hashedBucket.trim();
  const maxAttempts = input.maxAttempts ?? MAX_ATTEMPTS;
  const windowMs = input.windowMs ?? WINDOW_MS;
  if (!hashedBucket) {
    return { allowed: false, retryAfterMs: windowMs, count: 0 };
  }

  consumeUploadPortalRateLimit(hashedBucket, maxAttempts, windowMs);

  const nowMs = Date.now();
  const windowStart = windowStartFor(nowMs, windowMs);
  const expiresAt = new Date(windowStart.getTime() + windowMs);

  const row = await prisma.enterpriseDocumentWorkspaceRateLimit.upsert({
    where: {
      hashedBucket_windowStart: {
        hashedBucket,
        windowStart,
      },
    },
    create: {
      hashedBucket,
      windowStart,
      windowMs,
      count: 1,
      maxAttempts,
      organizationId: input.organizationId?.trim() || null,
      expiresAt,
    },
    update: {
      count: { increment: 1 },
      maxAttempts,
      expiresAt,
      organizationId: input.organizationId?.trim() || undefined,
    },
  });

  const allowed = row.count <= maxAttempts;
  const retryAfterMs = Math.max(0, expiresAt.getTime() - nowMs);
  if (!allowed && input.organizationId?.trim()) {
    await appendDocumentWorkspaceAuditBestEffort({
      organizationId: input.organizationId.trim(),
      actorType: DOCUMENT_WORKSPACE_AUDIT_ACTOR_SYSTEM,
      action: DOCUMENT_WORKSPACE_AUDIT_ACTIONS.UPLOAD_PORTAL_THROTTLED,
      outcome: "throttled",
      sourceChannel: "customer_portal",
      correlationId: input.correlationId,
      metadata: {
        hashedBucketPrefix: hashedBucket.slice(0, 12),
        windowStart: windowStart.toISOString(),
        count: row.count,
        maxAttempts,
      },
    });
  }
  return { allowed, retryAfterMs, count: row.count };
}
