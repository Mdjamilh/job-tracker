import type { StatusEvent } from "@/db/schema";
import { describeEvent } from "@/server/applications";

import { STATUS_STYLES } from "./status-badge";

const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

export function Timeline({ events }: { events: StatusEvent[] }) {
  return (
    <ol className="relative space-y-4 border-l border-line pl-5" data-testid="timeline">
      {[...events].reverse().map((event) => (
        <li key={event.id} className="relative">
          <span
            aria-hidden
            className={`absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full ring-4 ring-white ${STATUS_STYLES[event.toStatus].dot}`}
          />
          <p className="text-sm font-medium">{describeEvent(event)}</p>
          <p className="text-xs text-muted">
            <time dateTime={event.changedAt.toISOString()}>{dateTime.format(event.changedAt)}</time>
          </p>
        </li>
      ))}
    </ol>
  );
}
