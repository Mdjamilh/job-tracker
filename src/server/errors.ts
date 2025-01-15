export type DomainErrorCode =
  "NOT_FOUND" | "INVALID_TRANSITION" | "EMAIL_TAKEN" | "INVALID_CREDENTIALS" | "RATE_LIMITED";

/** An expected failure whose message is safe to show to the user. */
export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

/**
 * The same error for "doesn't exist" and "belongs to someone else", so
 * probing ids never reveals whether another user's record exists.
 */
export function notFound(): DomainError {
  return new DomainError("NOT_FOUND", "Application not found.");
}

/** Postgres unique_violation (23505), unwrapping driver/ORM error wrappers. */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth++) {
    if (typeof current === "object" && "code" in current && current.code === "23505") return true;
    current = typeof current === "object" && "cause" in current ? current.cause : undefined;
  }
  return false;
}
