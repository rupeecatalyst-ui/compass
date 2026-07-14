/**
 * Business Completion Framework errors — CF-WF-001.
 * Thrown when a process cannot continue until mandatory fields are completed.
 * Callers must open a Business Completion Card instead of an error toast.
 */

import type { BusinessCompletionRequest } from "@/types/business-completion";

export class BusinessCompletionRequiredError extends Error {
  readonly name = "BusinessCompletionRequiredError";
  readonly request: BusinessCompletionRequest;

  constructor(request: BusinessCompletionRequest) {
    super(
      request.message ??
        `Complete missing information to continue ${request.processTitle}.`,
    );
    this.request = request;
  }
}

export function isBusinessCompletionRequiredError(
  error: unknown,
): error is BusinessCompletionRequiredError {
  return error instanceof BusinessCompletionRequiredError;
}
