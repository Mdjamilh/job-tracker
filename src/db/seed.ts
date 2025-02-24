import { eq } from "drizzle-orm";

import { applicationInputSchema } from "@/lib/validation";
import type { Status } from "@/lib/status";
import { registerUser } from "@/server/auth";
import { createApplication, moveApplication, setFollowUp } from "@/server/applications";
import { addDays, toISODate } from "@/lib/dates";

import { users } from "./schema";
import type { Database } from "./types";

/** Shown on the log-in page in demo mode. Not a secret: the data is throwaway. */
/**
 * Fixed ids: in demo mode each serverless instance seeds its own in-memory
 * database, and identical ids let a session or a link made on one instance
 * work on another.
 */
export const DEMO_USER_ID = "5eed0000-0000-4000-8000-000000000000";
const demoAppId = (i: number) => `5eed0000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;

export const DEMO_ACCOUNT = {
  email: "demo@jobtracker.dev",
  password: "jobhunt-demo-2026",
  name: "Demo User",
};

type SeedApp = {
  company: string;
  role: string;
  salary?: [number, number];
  notes?: string;
  link?: string;
  /** [days ago, status] in order; the first entry is when it was added. */
  history: [number, Status][];
  followUpInDays?: number;
};

const APPS: SeedApp[] = [
  {
    company: "Northwind Health",
    role: "Frontend Engineer",
    salary: [105000, 125000],
    history: [
      [52, "wishlist"],
      [50, "applied"],
      [41, "interview"],
      [30, "offer"],
    ],
    notes: "Offer call went well. Asked for a written breakdown of equity.",
  },
  {
    company: "Lumen Labs",
    role: "Full-Stack Developer",
    salary: [95000, 115000],
    history: [
      [48, "applied"],
      [36, "interview"],
      [27, "rejected"],
    ],
    notes: "Panel liked the take-home; went with a more senior candidate.",
  },
  {
    company: "Brightline Transit",
    role: "Software Engineer I",
    history: [
      [44, "applied"],
      [30, "rejected"],
    ],
  },
  {
    company: "Cobalt Analytics",
    role: "Data Engineer",
    salary: [110000, 140000],
    history: [
      [40, "wishlist"],
      [38, "applied"],
      [25, "interview"],
    ],
    notes: "Second round: system design. Review partitioning and idempotent jobs.",
  },
  {
    company: "Harbor & Pine",
    role: "React Developer",
    history: [[35, "applied"]],
    link: "https://example.com/careers/react-developer",
  },
  {
    company: "Fieldnote",
    role: "TypeScript Engineer",
    salary: [100000, 120000],
    history: [
      [30, "applied"],
      [20, "interview"],
      [9, "offer"],
    ],
    notes: "Deadline to respond is next Friday.",
  },
  {
    company: "Quarry Systems",
    role: "Backend Engineer (Node)",
    history: [[26, "applied"]],
    followUpInDays: -2,
    notes: "Recruiter said to ping after two weeks.",
  },
  {
    company: "Meridian Bank",
    role: "Software Developer",
    salary: [90000, 105000],
    history: [
      [22, "applied"],
      [12, "interview"],
    ],
  },
  {
    company: "Tidewater Games",
    role: "Web Platform Engineer",
    history: [
      [18, "applied"],
      [6, "rejected"],
    ],
  },
  { company: "Aster Robotics", role: "Junior Software Engineer", history: [[15, "applied"]] },
  { company: "Kestrel Cloud", role: "Developer Advocate", history: [[11, "applied"]] },
  {
    company: "Orchard Health",
    role: "Software Engineer, Patient Apps",
    salary: [98000, 118000],
    history: [[6, "applied"]],
    link: "https://example.com/jobs/orchard-patient-apps",
  },
  { company: "Pinecrest Media", role: "Frontend Developer", history: [[3, "applied"]] },
  {
    company: "Sable Security",
    role: "Application Security Engineer",
    history: [[9, "wishlist"]],
    followUpInDays: 3,
    notes: "Apply once the portfolio site is live.",
  },
  { company: "Vantage Freight", role: "Full-Stack Engineer", history: [[2, "wishlist"]] },
  { company: "Juniper Learning", role: "Software Engineer", history: [[1, "wishlist"]] },
];

/** Creates the demo account and a realistic eight-week history, once. */
export async function seedDemo(db: Database, now = new Date()): Promise<void> {
  const existing = await db.query.users.findFirst({ where: eq(users.email, DEMO_ACCOUNT.email) });
  if (existing) return;

  const user = await registerUser(db, { ...DEMO_ACCOUNT, id: DEMO_USER_ID });
  const ago = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  for (const [index, seed] of APPS.entries()) {
    const [[addedDaysAgo, firstStatus], ...moves] = seed.history;
    const created = await createApplication(
      db,
      user.id,
      applicationInputSchema.parse({
        company: seed.company,
        role: seed.role,
        status: firstStatus,
        link: seed.link,
        salaryMin: seed.salary?.[0],
        salaryMax: seed.salary?.[1],
        notes: seed.notes,
      }),
      ago(addedDaysAgo),
      demoAppId(index),
    );
    for (const [daysAgo, status] of moves)
      await moveApplication(db, user.id, created.id, status, ago(daysAgo));
    if (seed.followUpInDays !== undefined) {
      await setFollowUp(db, user.id, created.id, addDays(toISODate(now), seed.followUpInDays), ago(0));
    }
  }
}
