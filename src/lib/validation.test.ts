import { describe, expect, it } from "vitest";

import { applicationInputSchema, fieldErrors, logInSchema, signUpSchema } from "./validation";

describe("sign-up validation", () => {
  it("normalizes the email", () => {
    const parsed = signUpSchema.parse({ name: " Sam ", email: "  Sam@Example.COM ", password: "long enough pw" });
    expect(parsed).toEqual({ name: "Sam", email: "sam@example.com", password: "long enough pw" });
  });

  it("rejects short passwords and passwords over bcrypt's 72-byte limit", () => {
    expect(signUpSchema.safeParse({ name: "a", email: "a@b.co", password: "short" }).success).toBe(false);
    // 25 three-byte characters = 75 bytes, though only 25 "characters".
    const multibyte = "€".repeat(25);
    const result = signUpSchema.safeParse({ name: "a", email: "a@b.co", password: multibyte });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error).password).toMatch(/72 bytes/);
  });

  it("does not apply strength rules at log-in", () => {
    expect(logInSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
    expect(logInSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});

describe("application validation", () => {
  const base = { company: "Acme", role: "Engineer" };

  it("fills defaults and turns empty form fields into nulls", () => {
    const parsed = applicationInputSchema.parse({
      ...base,
      link: "",
      salaryMin: "",
      salaryMax: "",
      appliedOn: "",
      notes: "  hi  ",
    });
    expect(parsed).toMatchObject({
      status: "wishlist",
      link: null,
      salaryMin: null,
      salaryMax: null,
      appliedOn: null,
      followUpOn: null,
      notes: "hi",
    });
  });

  it("coerces salary strings and checks the range", () => {
    expect(applicationInputSchema.parse({ ...base, salaryMin: "90000", salaryMax: "120000" })).toMatchObject({
      salaryMin: 90000,
      salaryMax: 120000,
    });
    const bad = applicationInputSchema.safeParse({ ...base, salaryMin: "130000", salaryMax: "120000" });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(fieldErrors(bad.error).salaryMax).toMatch(/at least the minimum/);
  });

  it("only accepts http(s) links", () => {
    expect(applicationInputSchema.safeParse({ ...base, link: "javascript:alert(1)" }).success).toBe(false);
    expect(applicationInputSchema.safeParse({ ...base, link: "not a url" }).success).toBe(false);
    expect(applicationInputSchema.parse({ ...base, link: "https://jobs.example.com/1" }).link).toBe(
      "https://jobs.example.com/1",
    );
  });

  it("rejects unknown statuses and malformed dates", () => {
    expect(applicationInputSchema.safeParse({ ...base, status: "ghosted" }).success).toBe(false);
    expect(applicationInputSchema.safeParse({ ...base, appliedOn: "10/23/2026" }).success).toBe(false);
  });
});
