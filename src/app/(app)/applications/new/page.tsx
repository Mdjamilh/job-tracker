import type { Metadata } from "next";

import { ApplicationForm } from "@/components/application-form";

import { createApplicationAction } from "../../actions";

export const metadata: Metadata = { title: "Add application" };

export default function NewApplicationPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Add application</h1>
      <ApplicationForm action={createApplicationAction} cancelHref="/board" />
    </div>
  );
}
