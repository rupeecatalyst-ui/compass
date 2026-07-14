import { toast } from "sonner";
import { isBusinessCompletionRequiredError } from "@/lib/business-completion";

/** CRC-004 / CF-CHANAKYA-001 — consistent user feedback for platform actions. */

function isBusinessGuidanceMessage(message: string): boolean {
  return /missing|required|mandatory|incomplete|cannot continue|need .+ before/i.test(message);
}

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
    // CF-WF-001 / CF-CHANAKYA-001 — business guidance is not a failure toast
    if (isBusinessCompletionRequiredError(error)) {
      toast.dismiss(toastId);
      throw error;
    }
    const message = error instanceof Error ? error.message : "Something unexpected happened.";
    if (isBusinessGuidanceMessage(message)) {
      // Never frame business gaps as rejected saves — dialog/card owns the UX
      toast.dismiss(toastId);
      throw error;
    }
    toast.message("I couldn't finish that just now.", {
      id: toastId,
      description: message,
    });
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
