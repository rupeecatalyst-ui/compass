/**
 * Compose advisory facing text via Tone Library + Micro Communication (CO-AI-106).
 */

import {
  EAI_ADVISORY_MAX_FRAGMENTS,
  EAI_ADVISORY_MAX_LINES_PER_FRAGMENT,
} from "@/constants/enterprise-ai-platform/advisory-reasoning";
import { applyEaiMicroCommunication } from "../domain-governance/micro-communication";
import { resolveEaiToneMessage } from "../domain-governance/tone-library";
import type { EaiAdvisoryFragment } from "@/types/enterprise-ai-advisory-reasoning";
import type { EaiToneCategoryId } from "@/types/enterprise-ai-domain-governance";
import type { EaiToneAudience } from "@/types/enterprise-ai-wealth-partner-behaviour";

export function composeEaiAdvisoryFacingText(
  fragments: EaiAdvisoryFragment[],
  audience: EaiToneAudience = "customer",
): {
  facingText: string;
  toneCategoryId?: EaiToneCategoryId;
} {
  const selected = fragments.slice(0, EAI_ADVISORY_MAX_FRAGMENTS);
  const toneCategoryId = selected.find((f) => f.toneCategoryId)?.toneCategoryId;
  const tone = toneCategoryId ? resolveEaiToneMessage(toneCategoryId, audience) : "";

  const bodyLines = selected.flatMap((f) =>
    f.lines.slice(0, EAI_ADVISORY_MAX_LINES_PER_FRAGMENT),
  );

  // Avoid duplicating tone lines already present in body
  const combined = [tone, ...bodyLines]
    .filter(Boolean)
    .filter((line, i, arr) => arr.indexOf(line) === i)
    .join("\n");

  const micro = applyEaiMicroCommunication(combined);
  return { facingText: micro.text, toneCategoryId };
}
