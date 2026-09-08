export type TentativeOfferCaps = {
  requiredAmountRupees: number | null;
  ltvSupportedAmountRupees: number | null;
  incomeSupportedAmountRupees: number | null;
  programmeMaxAmountRupees: number | null;
  otherPolicyCapRupees?: number | null;
};

export type TentativeOfferResult = {
  tentativeOfferRupees: number | null;
  shortfallRupees: number | null;
  bindingCap: keyof TentativeOfferCaps | null;
  capReasons: string[];
  status: "calculated" | "insufficient_inputs";
};

export function calculateTentativeOffer(caps: TentativeOfferCaps): TentativeOfferResult {
  const entries: Array<{ key: keyof TentativeOfferCaps; value: number; reason: string }> = [];
  if (caps.requiredAmountRupees != null && caps.requiredAmountRupees > 0) {
    entries.push({
      key: "requiredAmountRupees",
      value: Math.round(caps.requiredAmountRupees),
      reason: "Customer required amount",
    });
  }
  if (caps.ltvSupportedAmountRupees != null && caps.ltvSupportedAmountRupees > 0) {
    entries.push({
      key: "ltvSupportedAmountRupees",
      value: Math.round(caps.ltvSupportedAmountRupees),
      reason: "LTV-supported amount",
    });
  }
  if (caps.incomeSupportedAmountRupees != null && caps.incomeSupportedAmountRupees > 0) {
    entries.push({
      key: "incomeSupportedAmountRupees",
      value: Math.round(caps.incomeSupportedAmountRupees),
      reason: "Income-supported amount",
    });
  }
  if (caps.programmeMaxAmountRupees != null && caps.programmeMaxAmountRupees > 0) {
    entries.push({
      key: "programmeMaxAmountRupees",
      value: Math.round(caps.programmeMaxAmountRupees),
      reason: "Programme maximum",
    });
  }
  if (caps.otherPolicyCapRupees != null && caps.otherPolicyCapRupees > 0) {
    entries.push({
      key: "otherPolicyCapRupees",
      value: Math.round(caps.otherPolicyCapRupees),
      reason: "Other verified policy cap",
    });
  }

  if (entries.length === 0) {
    return {
      tentativeOfferRupees: null,
      shortfallRupees: null,
      bindingCap: null,
      capReasons: ["Insufficient verified caps to form a tentative offer."],
      status: "insufficient_inputs",
    };
  }

  const binding = entries.reduce((min, row) => (row.value < min.value ? row : min));
  const required = caps.requiredAmountRupees != null ? Math.round(caps.requiredAmountRupees) : null;
  const shortfall =
    required != null && binding.value < required ? required - binding.value : 0;

  return {
    tentativeOfferRupees: binding.value,
    shortfallRupees: shortfall,
    bindingCap: binding.key,
    capReasons: entries
      .filter((row) => row.value === binding.value)
      .map((row) => row.reason),
    status: "calculated",
  };
}
