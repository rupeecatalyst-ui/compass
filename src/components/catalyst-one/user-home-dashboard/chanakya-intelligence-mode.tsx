"use client";

/**
 * CO-C1-CHANAKYA-CHAT-WORKSPACE-UX-011
 * Intelligence mode fills the remaining authenticated viewport.
 */

import { ChanakyaInappConversationPanel } from "@/components/catalyst-one/user-home-dashboard/chanakya-inapp-conversation-panel";
import { ChanakyaConversationalWorkspace } from "@/components/catalyst-one/user-home-dashboard/chanakya-conversational-workspace";
import { CHANAKYA_DASHBOARD_INTELLIGENCE_SPRINT } from "@/constants/chanakya-dashboard-intelligence";

export function ChanakyaIntelligenceMode() {
  return (
    <div
      className="flex h-full min-h-0 flex-1 overflow-hidden"
      data-dashboard="chanakya-intelligence"
      data-sprint={CHANAKYA_DASHBOARD_INTELLIGENCE_SPRINT}
      data-read-only="true"
    >
      <ChanakyaConversationalWorkspace />
    </div>
  );
}

export { ChanakyaInappConversationPanel };
