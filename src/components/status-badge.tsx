import { STATUS_LABELS, type Status } from "@/lib/status";

export const STATUS_STYLES: Record<Status, { dot: string; badge: string }> = {
  wishlist: { dot: "bg-wishlist", badge: "bg-stone-100 text-stone-700" },
  applied: { dot: "bg-applied", badge: "bg-blue-50 text-blue-800" },
  interview: { dot: "bg-interview", badge: "bg-amber-50 text-amber-900" },
  offer: { dot: "bg-offer", badge: "bg-green-50 text-green-800" },
  rejected: { dot: "bg-rejected", badge: "bg-red-50 text-red-800" },
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status].badge}`}
    >
      <span aria-hidden className={`size-1.5 rounded-full ${STATUS_STYLES[status].dot}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}
