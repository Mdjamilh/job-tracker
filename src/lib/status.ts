/**
 * Application pipeline and the rules for moving between stages.
 *
 * Applications move forward: wishlist -> applied -> interview -> offer.
 * Skipping ahead is fine (a recruiter can jump you straight to an offer),
 * and anything already submitted can be marked rejected. Going backwards is
 * not allowed, with one exception: a rejected application can be reopened
 * as "applied", which covers the common "they came back to me" case.
 */
export const STATUSES = ["wishlist", "applied", "interview", "offer", "rejected"] as const;

export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  wishlist: "Wishlist",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

const TRANSITIONS: Record<Status, readonly Status[]> = {
  wishlist: ["applied", "interview", "offer"],
  applied: ["interview", "offer", "rejected"],
  interview: ["offer", "rejected"],
  offer: ["rejected"],
  rejected: ["applied"],
};

export function isStatus(value: unknown): value is Status {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}

/** Statuses an application in `from` may move to (never includes `from` itself). */
export function allowedTransitions(from: Status): readonly Status[] {
  return TRANSITIONS[from];
}

export function canTransition(from: Status, to: Status): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Human-readable reason a move is refused, for form and board feedback. */
export function transitionError(from: Status, to: Status): string | null {
  if (from === to) return `Already in ${STATUS_LABELS[to]}.`;
  if (canTransition(from, to)) return null;
  if (from === "rejected") return "A rejected application can only be reopened as Applied.";
  if (to === "rejected") return "Only submitted applications can be marked rejected.";
  return `Can't move back from ${STATUS_LABELS[from]} to ${STATUS_LABELS[to]}.`;
}

/** Stages that count as "the application was sent", used for funnel and reminders. */
export const SUBMITTED_STAGES: readonly Status[] = ["applied", "interview", "offer"];
