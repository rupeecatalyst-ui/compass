import type { ProgrammeEditorState } from "@/lib/product-programme-operations/editor-state";
import { structuredPayloadToCreateInput } from "@/lib/product-programme-operations/to-registry-input";
import type { CreateLenderProgramInput } from "@/types/enterprise-lender-registry";

export function toProgrammeWritePayload(
  state: ProgrammeEditorState,
): Omit<CreateLenderProgramInput, "createdBy"> {
  if (!state.lenderId.trim() || !state.code.trim() || !state.label.trim()) {
    throw new Error("Lender, programme code and name are required.");
  }
  const input = structuredPayloadToCreateInput(state, "ui");
  return Object.fromEntries(
    Object.entries(input).filter(([key]) => key !== "createdBy"),
  ) as Omit<CreateLenderProgramInput, "createdBy">;
}
