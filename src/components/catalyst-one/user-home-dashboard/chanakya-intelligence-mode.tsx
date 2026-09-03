"use client";

/**
 * CO-C1-CHANAKYA-CONVERSATIONAL-INTELLIGENCE-009
 * CHANAKYA Intelligence mode is a conversational workspace — not a dashboard of cards.
 */

import { ChanakyaInappConversationPanel } from "@/components/catalyst-one/user-home-dashboard/chanakya-inapp-conversation-panel";
import { ChanakyaConversationalWorkspace } from "@/components/catalyst-one/user-home-dashboard/chanakya-conversational-workspace";
import { CHANAKYA_DASHBOARD_INTELLIGENCE_SPRINT } from "@/constants/chanakya-dashboard-intelligence";

export function ChanakyaIntelligenceMode() {
  return (
    <div
      data-dashboard="chanakya-intelligence"
      data-sprint={CHANAKYA_DASHBOARD_INTELLIGENCE_SPRINT}
      data-read-only="true"
    >
      <ChanakyaConversationalWorkspace />
    </div>
  );
}

export { ChanakyaInappConversationPanel };
