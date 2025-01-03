import { relations, sql } from "drizzle-orm";
import { check, date, index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { STATUSES } from "../lib/status";

export const applicationStatus = pgEnum("application_status", STATUSES);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Stored lowercased; the unique index is what stops duplicate sign-ups.
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Server-side sessions. The browser holds a random token; only its SHA-256
 * hash is stored, so a leaked database dump can't be replayed as cookies.
 */
export const sessions = pgTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    company: text("company").notNull(),
    role: text("role").notNull(),
    link: text("link"),
    status: applicationStatus("status").notNull().default("wishlist"),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    notes: text("notes").notNull().default(""),
    appliedOn: date("applied_on"),
    followUpOn: date("follow_up_on"),
    statusChangedAt: timestamp("status_changed_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("applications_user_status_idx").on(t.userId, t.status),
    check(
      "salary_range_valid",
      sql`${t.salaryMin} IS NULL OR ${t.salaryMax} IS NULL OR ${t.salaryMin} <= ${t.salaryMax}`,
    ),
  ],
);

/** Append-only history of status changes; the first row is the creation. */
export const statusEvents = pgTable(
  "status_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fromStatus: applicationStatus("from_status"),
    toStatus: applicationStatus("to_status").notNull(),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("status_events_application_idx").on(t.applicationId, t.changedAt)],
);

export const usersRelations = relations(users, ({ many }) => ({
  applications: many(applications),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  user: one(users, { fields: [applications.userId], references: [users.id] }),
  events: many(statusEvents),
}));

export const statusEventsRelations = relations(statusEvents, ({ one }) => ({
  application: one(applications, { fields: [statusEvents.applicationId], references: [applications.id] }),
}));

export type User = typeof users.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type StatusEvent = typeof statusEvents.$inferSelect;
