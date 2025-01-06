import { z } from "zod";

import { STATUSES } from "./status";

/** bcrypt only looks at the first 72 bytes, so longer passwords would silently collide. */
const MAX_PASSWORD_BYTES = 72;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: "Enter a valid email address." }).max(254));

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .refine((value) => new TextEncoder().encode(value).length <= MAX_PASSWORD_BYTES, {
    message: "Use at most 72 bytes (bcrypt ignores anything longer).",
  });

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Tell us your name.").max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const logInSchema = z.object({
  email: emailSchema,
  // No strength rules at log-in: only reject empty or oversized input.
  password: z.string().min(1, "Enter your password.").max(200),
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullish()
    .transform((v) => v ?? null);

/** Only http(s) links are stored, so a saved link can never be a `javascript:` URL. */
const linkSchema = optionalText(2048).refine(
  (v) => {
    if (v === null) return true;
    try {
      const url = new URL(v);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  },
  { message: "Enter a full http(s) link, like https://example.com/jobs/1." },
);

const salary = z
  .union([z.literal(""), z.coerce.number().int("Use whole numbers.").min(0).max(10_000_000)])
  .nullish()
  .transform((v) => (v === "" || v == null ? null : v));

const isoDate = z
  .union([z.literal(""), z.iso.date({ message: "Use a YYYY-MM-DD date." })])
  .nullish()
  .transform((v) => (v ? v : null));

export const applicationInputSchema = z
  .object({
    company: z.string().trim().min(1, "Company is required.").max(120),
    role: z.string().trim().min(1, "Role is required.").max(120),
    link: linkSchema,
    status: z.enum(STATUSES).default("wishlist"),
    salaryMin: salary,
    salaryMax: salary,
    notes: z
      .string()
      .max(5000)
      .nullish()
      .transform((v) => v?.trim() ?? ""),
    appliedOn: isoDate,
    followUpOn: isoDate,
  })
  .refine((v) => v.salaryMin === null || v.salaryMax === null || v.salaryMin <= v.salaryMax, {
    path: ["salaryMax"],
    message: "Maximum salary must be at least the minimum.",
  });

export type ApplicationInput = z.output<typeof applicationInputSchema>;

/** Field name -> first error message, for rendering next to form inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
