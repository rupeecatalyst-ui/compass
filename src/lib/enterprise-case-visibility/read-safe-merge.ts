/** Preserve omitted/redacted JSON fields during canonical saves. No persistence here. */
type JsonObject = Record<string, unknown>;
function object(value: unknown): value is JsonObject { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
export function mergeReadSafeJson(previous: unknown, submitted: unknown): unknown {
  if (!object(previous)) return submitted;
  if (!object(submitted)) return previous; // A redacted null must never clear persisted JSON.
  const merged: JsonObject = { ...previous };
  for (const [key, value] of Object.entries(submitted)) {
    if (value === undefined || ["__proto__", "constructor", "prototype"].includes(key)) continue;
    if (Array.isArray(value) && Array.isArray(previous[key]) && value.every(object)) {
      const old = previous[key] as unknown[];
      const updated = value.map(item => {
        const match = old.find(candidate => object(candidate) && item.id && candidate.id === item.id);
        return mergeReadSafeJson(match, item);
      });
      merged[key] = key === "lenders" ? [...old.filter(candidate => !updated.some(item => object(candidate) && object(item) && candidate.id && candidate.id === item.id)), ...updated] : updated;
    } else merged[key] = object(value) ? mergeReadSafeJson(previous[key], value) : value;
  }
  return merged;
}
function belongs(card: unknown, deal: { id: string; lenderId: string | null }) {
  if (!object(card)) return false;
  const id = String(card.enterpriseDealId || ""), lender = String(card.lenderRegistryId || card.lenderId || "");
  return (id ? id === deal.id : Boolean(deal.lenderId && lender === deal.lenderId)) && (!lender || lender === deal.lenderId);
}
export function mergeDealReadSafeSnapshot(previous: unknown, submitted: unknown, deal: { id: string; lenderId: string | null }) {
  const merged = mergeReadSafeJson(previous, submitted);
  if (!object(merged) || !object(submitted) || !Array.isArray(submitted.lenders)) return merged;
  const old = object(previous) && Array.isArray(previous.lenders) ? previous.lenders : [];
  const incoming = submitted.lenders;
  if (incoming.some(card => !belongs(card, deal))) throw new Error("Snapshot may update only the selected lender-specific Deal");
  const next = [...old];
  for (const card of incoming) {
    const item = card as JsonObject;
    let index = next.findIndex(candidate => belongs(candidate, deal) && object(candidate) && (
      item.id && candidate.id === item.id || item.lenderSalesContactId && candidate.lenderSalesContactId === item.lenderSalesContactId
    ));
    if (index < 0) {
      const candidates = next.map((value, position) => belongs(value, deal) ? position : -1).filter(position => position >= 0);
      if (candidates.length === 1) index = candidates[0];
    }
    if (index >= 0) next[index] = mergeReadSafeJson(next[index], item);
    else next.push(item);
  }
  merged.lenders = next;
  return merged;
}
