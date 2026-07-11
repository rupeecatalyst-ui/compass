export const PRODUCT_CONVERSATION_ACKS = [
  "Great choice.",
  "Perfect.",
  "That helps.",
  "Got it.",
  "Excellent.",
  "Almost done.",
] as const;

export type ProductConversationStep =
  | {
      id: string;
      type: "options";
      prompt: string;
      options: readonly { id: string; label: string }[];
    }
  | {
      id: string;
      type: "currency";
      prompt: string;
      helper?: string;
      placeholder: string;
    }
  | {
      id: string;
      type: "city";
      prompt: string;
      helper?: string;
      placeholder: string;
    }
  | {
      id: string;
      type: "reveal";
      prompt: string;
      helper?: string;
      cta: string;
    };

export type ProductConversationConfig = {
  welcome: {
    greeting: string;
    headline: string;
    body: string;
    note: string;
    cta: string;
  };
  empathyLine?: string;
  analysis: {
    title: string;
    steps: readonly string[];
  };
  result: {
    title: string;
    cards: readonly { title: string; value: string }[];
  };
  steps: readonly ProductConversationStep[];
};

export type ProductConversationAnswers = Record<string, string | number | undefined>;

export function getProductConversationNextStep(
  steps: readonly ProductConversationStep[],
  answers: ProductConversationAnswers,
): string | null {
  for (const step of steps) {
    if (step.type === "reveal") continue;
    if (!answers[step.id]) return step.id;
  }
  return steps.find((s) => s.type === "reveal")?.id ?? null;
}
