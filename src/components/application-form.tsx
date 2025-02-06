"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { FormState } from "@/app/(app)/actions";
import type { Application } from "@/db/schema";
import { STATUSES, STATUS_LABELS, allowedTransitions } from "@/lib/status";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  application?: Application;
  cancelHref: string;
};

export function ApplicationForm({ action, application, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const v = (key: keyof Application) => {
    if (state.values && key in state.values) return state.values[key];
    const value = application?.[key];
    return value === null || value === undefined ? "" : String(value);
  };
  const err = (key: string) => state.fields?.[key];

  // On edit, only offer the current status and the moves the rules allow.
  const statusOptions = application
    ? [application.status, ...allowedTransitions(application.status)]
    : STATUSES;

  return (
    <form action={formAction} className="card space-y-5 p-5" noValidate>
      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-rejected">
          {state.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Company" name="company" defaultValue={v("company")} error={err("company")} required />
        <Input label="Role" name="role" defaultValue={v("role")} error={err("role")} required />
      </div>

      <Input
        label="Job posting link"
        name="link"
        type="url"
        placeholder="https://"
        defaultValue={v("link")}
        error={err("link")}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" className="field" defaultValue={v("status") || "wishlist"}>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          {err("status") && <p className="mt-1 text-sm text-rejected">{err("status")}</p>}
        </div>
        <Input
          label="Applied on"
          name="appliedOn"
          type="date"
          defaultValue={v("appliedOn")}
          error={err("appliedOn")}
        />
        <Input
          label="Follow up on"
          name="followUpOn"
          type="date"
          defaultValue={v("followUpOn")}
          error={err("followUpOn")}
        />
      </div>

      <fieldset>
        <legend className="label">Salary range (USD per year)</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Minimum"
            srOnlyLabel
            name="salaryMin"
            inputMode="numeric"
            placeholder="Min"
            defaultValue={v("salaryMin")}
            error={err("salaryMin")}
          />
          <Input
            label="Maximum"
            srOnlyLabel
            name="salaryMax"
            inputMode="numeric"
            placeholder="Max"
            defaultValue={v("salaryMax")}
            error={err("salaryMax")}
          />
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="notes">
          Notes
        </label>
        <textarea id="notes" name="notes" rows={5} className="field" defaultValue={v("notes")} />
        {err("notes") && <p className="mt-1 text-sm text-rejected">{err("notes")}</p>}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Link href={cancelHref} className="btn-ghost">
          Cancel
        </Link>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving..." : application ? "Save changes" : "Add application"}
        </button>
      </div>
    </form>
  );
}

function Input({
  label,
  name,
  error,
  srOnlyLabel,
  ...rest
}: {
  label: string;
  name: string;
  error?: string;
  srOnlyLabel?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className={srOnlyLabel ? "sr-only" : "label"} htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        className="field"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        {...rest}
      />
      {error && (
        <p id={`${name}-error`} className="mt-1 text-sm text-rejected">
          {error}
        </p>
      )}
    </div>
  );
}
