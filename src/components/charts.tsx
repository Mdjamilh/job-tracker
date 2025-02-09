import { formatDate } from "@/lib/dates";
import { formatPercent, type FunnelStep, type WeekBucket } from "@/lib/stats";

/*
 * Hand-made SVG charts: one series each, so one hue (the accent) and no
 * legend; the heading names the series. Each mark carries a <title> for a
 * hover tooltip, and each chart has a table view for screen readers and
 * anyone who prefers numbers.
 */

const W = 640;
const H = 220;
const PAD = { top: 16, right: 8, bottom: 28, left: 28 };

function niceMax(value: number): number {
  if (value <= 4) return 4;
  const step = value <= 10 ? 2 : value <= 25 ? 5 : 10;
  return Math.ceil(value / step) * step;
}

/** Rect with only the top corners rounded, anchored flat on the baseline. */
function topRoundedBar(x: number, y: number, w: number, h: number, r = 4): string {
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

export function WeeklyChart({ weeks }: { weeks: WeekBucket[] }) {
  const max = niceMax(Math.max(0, ...weeks.map((w) => w.count)));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / weeks.length;
  const barW = Math.min(36, slot * 0.6);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, max / 2, max];
  const peak = Math.max(...weeks.map((w) => w.count));

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-labelledby="weekly-title">
        <title id="weekly-title">Applications submitted per week, last {weeks.length} weeks</title>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#e7e5e4" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" className="fill-stone-500 text-[11px]">
              {t}
            </text>
          </g>
        ))}
        {weeks.map((w, i) => {
          const x = PAD.left + i * slot + (slot - barW) / 2;
          const h = innerH - (y(w.count) - PAD.top);
          return (
            <g key={w.weekStart} className="group">
              <title>{`Week of ${formatDate(w.weekStart)}: ${w.count} submitted`}</title>
              {/* Hit target spans the whole slot, larger than the bar. */}
              <rect x={PAD.left + i * slot} y={PAD.top} width={slot} height={innerH} fill="transparent" />
              {w.count > 0 && (
                <path
                  d={topRoundedBar(x, y(w.count), barW, h)}
                  className="fill-accent transition-opacity group-hover:opacity-80"
                />
              )}
              {(w.count === peak && peak > 0) || i === weeks.length - 1 ? (
                <text
                  x={x + barW / 2}
                  y={y(w.count) - 5}
                  textAnchor="middle"
                  className="fill-stone-700 text-[11px] font-medium"
                >
                  {w.count}
                </text>
              ) : null}
              <text x={x + barW / 2} y={H - 8} textAnchor="middle" className="fill-stone-500 text-[11px]">
                {formatDate(w.weekStart).replace(/, \d{4}$/, "")}
              </text>
            </g>
          );
        })}
      </svg>
      <DataTable
        caption="Applications per week"
        headers={["Week of", "Submitted"]}
        rows={weeks.map((w) => [formatDate(w.weekStart), String(w.count)])}
      />
    </figure>
  );
}

export function FunnelChart({ steps }: { steps: FunnelStep[] }) {
  const max = Math.max(1, steps[0]?.count ?? 0);
  return (
    <figure>
      <ol className="space-y-3" aria-label="Conversion funnel">
        {steps.map((step) => (
          <li
            key={step.stage}
            title={`${step.label}: ${step.count}${step.rate === null ? "" : `, ${formatPercent(step.rate)} of previous step`}`}
          >
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="font-medium">{step.label}</span>
              <span className="text-muted">
                <span className="font-semibold text-ink" data-testid={`funnel-${step.stage}`}>
                  {step.count}
                </span>
                {step.rate !== null && <span> &middot; {formatPercent(step.rate)} of previous</span>}
              </span>
            </div>
            <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="h-3 w-full" aria-hidden>
              <rect x={0} y={0} width={100} height={8} rx={2} className="fill-stone-100" />
              {step.count > 0 && (
                <rect
                  x={0}
                  y={0}
                  width={(step.count / max) * 100}
                  height={8}
                  rx={2}
                  className="fill-accent"
                />
              )}
            </svg>
          </li>
        ))}
      </ol>
      <DataTable
        caption="Funnel"
        headers={["Stage", "Applications", "From previous step"]}
        rows={steps.map((s) => [s.label, String(s.count), formatPercent(s.rate) || "-"])}
      />
    </figure>
  );
}

function DataTable({ caption, headers, rows }: { caption: string; headers: string[]; rows: string[][] }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-muted">Show as table</summary>
      <table className="mt-2 w-full text-left">
        <caption className="sr-only">{caption}</caption>
        <thead className="text-xs text-muted">
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col" className="py-1 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]} className="border-t border-line">
              {row.map((cell, i) => (
                <td key={i} className="py-1">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
