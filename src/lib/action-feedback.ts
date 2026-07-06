import { toast } from "sonner";

/** CRC-004 — consistent user feedback for platform actions. */

export async function runWithFeedback<T>(
  label: string,
  action: () => T | Promise<T>,
  options?: {
    successMessage?: string;
    description?: string;
    onSuccess?: (result: T) => void;
  },
): Promise<T> {
  const toastId = toast.loading(`${label}...`);
  try {
    const result = await action();
    toast.success(options?.successMessage ?? `${label} successful.`, {
      id: toastId,
      description: options?.description,
    });
    options?.onSuccess?.(result);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong.";
    toast.error(`${label} failed.`, { id: toastId, description: message });
    throw error;
  }
}

export const feedback = {
  customerCreated: () => toast.success("Customer created successfully."),
  customerUpdated: () => toast.success("Customer updated successfully."),
  loanCreated: (fileNumber: string) =>
    toast.success("Loan created successfully.", { description: fileNumber }),
  loanUpdated: () => toast.success("Loan updated successfully."),
  documentUploaded: () => toast.success("Document uploaded successfully."),
  taskAssigned: () => toast.success("Task assigned successfully."),
  noteSaved: () => toast.success("Note saved successfully."),
};
