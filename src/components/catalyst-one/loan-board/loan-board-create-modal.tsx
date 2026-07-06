"use client";

import { useLoanBoardContext } from "@/components/catalyst-one/loan-board/loan-board-context";
import { LoanCreateFormDialog } from "@/components/catalyst-one/loan-files/loan-create-form-dialog";
import { useToast } from "@/hooks/use-toast";

export function LoanBoardCreateModal() {
  const { createOpen, setCreateOpen, addFile } = useLoanBoardContext();
  const { success } = useToast();

  return (
    <LoanCreateFormDialog
      open={createOpen}
      onOpenChange={setCreateOpen}
      onSubmit={(input) => {
        addFile(input);
        success("Loan file created", `${input.customerName} added to Raw Lead.`);
      }}
    />
  );
}
