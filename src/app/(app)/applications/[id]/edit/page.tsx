import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ApplicationForm } from "@/components/application-form";
import { getDb } from "@/db";
import { getApplication } from "@/server/applications";
import { DomainError } from "@/server/errors";
import { requireUser } from "@/server/session";

import { updateApplicationAction } from "../../../actions";

export const metadata: Metadata = { title: "Edit application" };

export default async function EditApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const app = await getApplication(await getDb(), user.id, id).catch((error) => {
    if (error instanceof DomainError && error.code === "NOT_FOUND") notFound();
    throw error;
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Edit {app.company}</h1>
      <ApplicationForm
        action={updateApplicationAction.bind(null, app.id)}
        application={app}
        cancelHref={`/applications/${app.id}`}
      />
    </div>
  );
}
