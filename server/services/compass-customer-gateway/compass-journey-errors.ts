/**
 * Typed COMPASS gateway failures — diagnosable codes, customer-safe messages.
 */
export class CompassJourneyError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(code: string, message: string, httpStatus = 400) {
    super(message);
    this.name = "CompassJourneyError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export function isDatabaseUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /P1001|P1017|can't reach database|can't connect|ECONNREFUSED|ENOTFOUND|database unavailable|ConnectionReset/i.test(
    message,
  );
}

export function toCompassGatewayFailure(error: unknown, fallbackCode: string, fallbackMessage: string) {
  if (error instanceof CompassJourneyError) {
    return { code: error.code, message: error.message, httpStatus: error.httpStatus };
  }
  if (isDatabaseUnavailableError(error)) {
    return {
      code: "DATABASE_UNAVAILABLE",
      message: "Application services are temporarily unavailable. Please try again shortly.",
      httpStatus: 503,
    };
  }
  const message = error instanceof Error && error.message ? error.message : fallbackMessage;
  return { code: fallbackCode, message, httpStatus: 400 };
}
