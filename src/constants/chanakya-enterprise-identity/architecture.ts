import type { ChanakyaArchitectureLayerEntry } from "@/types/chanakya-enterprise-identity";

export const CEI_INTELLIGENCE_LAYER: ChanakyaArchitectureLayerEntry[] = [
  {
    key: "decision_engine",
    name: "Decision Engine",
    description: "Enterprise Decision Engine (EDE) — reasoned recommendations and advisory levels.",
    layer: "intelligence",
    status: "active",
  },
  {
    key: "memory_engine",
    name: "Memory Engine",
    description: "Session memory, coaching responses, and journey continuity.",
    layer: "intelligence",
    status: "active",
  },
  {
    key: "knowledge_engine",
    name: "Knowledge Engine",
    description: "Foundation Libraries, product context, and enterprise reference corpora.",
    layer: "intelligence",
    status: "active",
  },
  {
    key: "learning_engine",
    name: "Learning Engine",
    description: "Closed-loop coaching signals and stage transition learning.",
    layer: "intelligence",
    status: "active",
  },
  {
    key: "coaching_engine",
    name: "Coaching Engine",
    description: "Stage coaching, business coaching, and guided journey prompts.",
    layer: "intelligence",
    status: "active",
  },
];

export const CEI_PRESENTATION_LAYER: ChanakyaArchitectureLayerEntry[] = [
  {
    key: "avatar",
    name: "Avatar",
    description: "Configurable Enterprise Avatar Framework — premium illustrated presence.",
    layer: "presentation",
    status: "active",
  },
  {
    key: "greeting",
    name: "Greeting",
    description: "Greeting Library and time-of-day personalization.",
    layer: "presentation",
    status: "active",
  },
  {
    key: "cards",
    name: "Cards",
    description: "Briefing, journey, coaching, and advisory cards.",
    layer: "presentation",
    status: "active",
  },
  {
    key: "conversation",
    name: "Conversation",
    description: "Universal Guided Journey and dialogue-first workflows.",
    layer: "presentation",
    status: "active",
  },
  {
    key: "voice",
    name: "Voice",
    description: "Future spoken CHANAKYA presence.",
    layer: "presentation",
    status: "planned",
  },
  {
    key: "expressions",
    name: "Expressions",
    description: "Future avatar expression packs from Experience Console.",
    layer: "presentation",
    status: "planned",
  },
];
