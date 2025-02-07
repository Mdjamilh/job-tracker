"use client";

import { useTransition } from "react";

import { deleteApplicationAction } from "@/app/(app)/actions";

export function DeleteButton({ id, company }: { id: string; company: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn-danger sm:ml-auto"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Delete the ${company} application and its timeline? This can't be undone.`))
          return;
        startTransition(() => deleteApplicationAction(id));
      }}
    >
      {pending ? "Deleting..." : "Delete"}
    </button>
  );
}
