import { redirect } from "next/navigation";

import { getCurrentUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  redirect((await getCurrentUser()) ? "/board" : "/login");
}
