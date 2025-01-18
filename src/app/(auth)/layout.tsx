import { redirect } from "next/navigation";

import { getCurrentUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentUser()) redirect("/board");
  return (
    <main className="mx-auto flex max-w-md flex-col px-4 py-12 sm:py-20">
      <p className="mb-8 text-center text-lg font-semibold tracking-tight">
        <span className="text-accent">Job</span> Tracker
      </p>
      {children}
    </main>
  );
}
