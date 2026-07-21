import type { LoanParticipantEntityType, ParticipantEntityOption } from "@/types/loan-participant";

export function searchParticipantEntities(
  query: string,
  options: ParticipantEntityOption[],
  entityType?: LoanParticipantEntityType,
): ParticipantEntityOption[] {
  const q = query.trim().toLowerCase();
  return options.filter((option) => {
    if (entityType && option.entityType !== entityType) return false;
    if (!q) return true;
    return (
      option.name.toLowerCase().includes(q) ||
      option.mobile?.toLowerCase().includes(q) ||
      option.email?.toLowerCase().includes(q)
    );
  });
}
