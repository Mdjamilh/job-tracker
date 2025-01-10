import { applicationInputSchema, type ApplicationInput } from "@/lib/validation";
import { registerUser, type PublicUser } from "@/server/auth";
import type { Database } from "@/db/types";

let counter = 0;

export function makeUser(db: Database, name = `User ${++counter}`): Promise<PublicUser> {
  return registerUser(db, {
    name,
    email: `${name.toLowerCase().replace(/\W+/g, ".")}.${counter}@example.com`,
    password: "test password 123",
  });
}

export function input(overrides: Partial<Record<keyof ApplicationInput, unknown>> = {}): ApplicationInput {
  return applicationInputSchema.parse({ company: "Acme", role: "Software Engineer", ...overrides });
}
