"use client";

import { useLoanFiles } from "@/components/catalyst-one/loan-files/loan-files-context";
import { LoanCreateFormDialog } from "@/components/catalyst-one/loan-files/loan-create-form-dialog";
import { useToast } from "@/hooks/use-toast";

export function CreateLoanModal() {
  const { createOpen, setCreateOpen, addFile } = useLoanFiles();
  const { success } = useToast();

  return (
    <LoanCreateFormDialog
      open={createOpen}
      onOpenChange={setCreateOpen}
      onSubmit={(input) => {
        addFile(input);
        success("Loan file created", `${input.customerName} added to Raw Lead.`);
      }}
      title="New Loan File"
    />
  );
}
