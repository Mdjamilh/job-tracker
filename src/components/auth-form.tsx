"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { AuthFormState } from "@/app/(auth)/actions";

type Props = {
  mode: "login" | "signup";
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  defaultEmail?: string;
};

export function AuthForm({ mode, action, defaultEmail }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const isSignup = mode === "signup";

  return (
    <form action={formAction} className="card space-y-4 p-6" noValidate>
      <h1 className="text-xl font-semibold">{isSignup ? "Create your account" : "Log in"}</h1>

      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-rejected">
          {state.error}
        </p>
      )}

      {isSignup && (
        <Field
          label="Name"
          name="name"
          autoComplete="name"
          defaultValue={state.values?.name}
          error={state.fields?.name}
        />
      )}
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email ?? defaultEmail}
        error={state.fields?.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete={isSignup ? "new-password" : "current-password"}
        hint={isSignup ? "At least 10 characters." : undefined}
        error={state.fields?.password}
      />

      <button type="submit" className="btn-primary w-full py-2" disabled={pending}>
        {pending ? "Please wait..." : isSignup ? "Sign up" : "Log in"}
      </button>

      <p className="text-center text-sm text-muted">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link className="font-medium text-accent underline" href="/login">
              Log in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link className="font-medium text-accent underline" href="/signup">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  error,
  hint,
  ...input
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const describedBy = error ? `${name}-error` : hint ? `${name}-hint` : undefined;
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        className="field"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        required
        {...input}
      />
      {error ? (
        <p id={`${name}-error`} className="mt-1 text-sm text-rejected">
          {error}
        </p>
      ) : hint ? (
        <p id={`${name}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
