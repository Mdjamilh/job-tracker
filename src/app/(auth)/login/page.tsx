import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-form";
import { isDemoMode } from "@/db";
import { DEMO_ACCOUNT } from "@/db/seed";

import { logInAction } from "../actions";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  const demo = isDemoMode();
  return (
    <div className="space-y-4">
      {demo && (
        <section
          aria-labelledby="demo-heading"
          className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm"
        >
          <h2 id="demo-heading" className="font-semibold text-amber-950">
            Try the demo account
          </h2>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="text-amber-900">Email</dt>
            <dd className="font-mono" data-testid="demo-email">
              {DEMO_ACCOUNT.email}
            </dd>
            <dt className="text-amber-900">Password</dt>
            <dd className="font-mono" data-testid="demo-password">
              {DEMO_ACCOUNT.password}
            </dd>
          </dl>
          <p className="mt-2 text-amber-900">Or sign up with any email; it only lives in this demo.</p>
        </section>
      )}
      <AuthForm mode="login" action={logInAction} defaultEmail={demo ? DEMO_ACCOUNT.email : undefined} />
    </div>
  );
}
