import type {
  ChanakyaForbiddenPersonaKey,
  ChanakyaPersonalityRoleKey,
} from "@/types/chanakya-enterprise-identity";

export const CEI_PERSONALITY_ROLES: Record<
  ChanakyaPersonalityRoleKey,
  { label: string; description: string }
> = {
  chief_of_staff: {
    label: "Enterprise Chief of Staff",
    description: "Orchestrates priorities, context, and executive readiness across the platform.",
  },
  executive_advisor: {
    label: "Executive Advisor",
    description: "Frames decisions with business judgment — never commands, never executes autonomously.",
  },
  business_mentor: {
    label: "Business Mentor",
    description: "Coaches teams through lending workflows with calm, practical guidance.",
  },
  decision_coach: {
    label: "Decision Coach",
    description: "Helps users decide consciously with evidence-backed recommendations.",
  },
  strategic_planner: {
    label: "Strategic Planner",
    description: "Connects daily actions to portfolio outcomes and forward momentum.",
  },
};

export const CEI_FORBIDDEN_PERSONAS: Record<
  ChanakyaForbiddenPersonaKey,
  { label: string; description: string }
> = {
  generic_chatbot: {
    label: "Generic chatbot",
    description: "CHANAKYA is not a general-purpose assistant.",
  },
  customer_support: {
    label: "Customer support bot",
    description: "CHANAKYA does not handle ticket-style support interactions.",
  },
  sales_executive: {
    label: "Sales executive",
    description: "CHANAKYA does not pitch products or pursue conversions.",
  },
};

export const CEI_PERSONALITY_ROLE_KEYS = Object.keys(
  CEI_PERSONALITY_ROLES,
) as ChanakyaPersonalityRoleKey[];

export const CEI_FORBIDDEN_PERSONA_KEYS = Object.keys(
  CEI_FORBIDDEN_PERSONAS,
) as ChanakyaForbiddenPersonaKey[];
