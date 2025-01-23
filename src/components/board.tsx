"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";

import { moveApplicationAction } from "@/app/(app)/actions";
import type { Application } from "@/db/schema";
import { formatSalary } from "@/lib/format";
import { STATUSES, STATUS_LABELS, canTransition, transitionError, type Status } from "@/lib/status";

import { STATUS_STYLES } from "./status-badge";

type Card = Pick<Application, "id" | "company" | "role" | "status" | "salaryMin" | "salaryMax" | "appliedOn">;

/**
 * Kanban board. Mouse users drag cards between columns (native HTML5 drag
 * and drop); keyboard and touch users use each card's "Move to" menu, which
 * calls the same server action. Columns a card can't move to are dimmed
 * while dragging, and the server re-checks the rule either way.
 */
export function Board({ applications }: { applications: Card[] }) {
  const [optimistic, applyMove] = useOptimistic(applications, (cards, move: { id: string; to: Status }) =>
    cards.map((c) => (c.id === move.id ? { ...c, status: move.to } : c)),
  );
  const [, startTransition] = useTransition();
  const [dragging, setDragging] = useState<Card | null>(null);
  const [over, setOver] = useState<Status | null>(null);
  const [message, setMessage] = useState("");

  function move(card: Card, to: Status) {
    const problem = transitionError(card.status, to);
    if (problem) {
      setMessage(problem);
      return;
    }
    startTransition(async () => {
      applyMove({ id: card.id, to });
      const result = await moveApplicationAction(card.id, to);
      setMessage(
        result.ok
          ? `Moved ${card.company} to ${STATUS_LABELS[to]}.`
          : `Couldn't move ${card.company}: ${result.error}`,
      );
    });
  }

  return (
    <>
      <p
        aria-live="polite"
        role="status"
        className="mb-3 min-h-5 text-sm text-muted"
        data-testid="board-status"
      >
        {message}
      </p>
      <div className="grid gap-4 md:grid-cols-5">
        {STATUSES.map((status) => {
          const cards = optimistic.filter((c) => c.status === status);
          const droppable = dragging ? canTransition(dragging.status, status) : false;
          return (
            <section
              key={status}
              aria-labelledby={`col-${status}`}
              data-testid={`column-${status}`}
              onDragOver={(e) => {
                if (!droppable) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setOver(status);
              }}
              onDragLeave={() => setOver((s) => (s === status ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                if (dragging) move(dragging, status);
                setDragging(null);
              }}
              className={`flex min-h-40 flex-col rounded-lg border bg-stone-100/70 p-2 transition ${
                over === status ? "border-accent ring-2 ring-accent/30" : "border-transparent"
              } ${dragging && !droppable && dragging.status !== status ? "opacity-40" : ""}`}
            >
              <h2 id={`col-${status}`} className="flex items-center gap-2 px-1 pb-2 text-sm font-semibold">
                <span aria-hidden className={`size-2 rounded-full ${STATUS_STYLES[status].dot}`} />
                {STATUS_LABELS[status]}
                <span className="ml-auto rounded bg-white px-1.5 text-xs font-normal text-muted">
                  {cards.length}
                </span>
              </h2>
              <ul className="flex flex-col gap-2">
                {cards.map((card) => (
                  <BoardCard
                    key={card.id}
                    card={card}
                    onMove={(to) => move(card, to)}
                    onDragStart={() => setDragging(card)}
                    onDragEnd={() => {
                      setDragging(null);
                      setOver(null);
                    }}
                  />
                ))}
              </ul>
              {cards.length === 0 && (
                <p className="px-1 py-4 text-center text-xs text-muted">Nothing here yet</p>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

function BoardCard({
  card,
  onMove,
  onDragStart,
  onDragEnd,
}: {
  card: Card;
  onMove: (to: Status) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const targets = STATUSES.filter((s) => canTransition(card.status, s));
  const salary = formatSalary(card.salaryMin, card.salaryMax);
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", card.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      data-testid="board-card"
      className="card cursor-grab p-3 shadow-xs active:cursor-grabbing"
    >
      <Link href={`/applications/${card.id}`} className="block font-medium hover:underline">
        {card.company}
      </Link>
      <p className="text-sm text-muted">{card.role}</p>
      {salary && <p className="mt-1 text-xs text-muted">{salary}</p>}
      {targets.length > 0 && (
        <label className="mt-2 block">
          <span className="sr-only">Move {card.company} to</span>
          <select
            className="w-full rounded border border-line bg-white px-1.5 py-1 text-xs"
            value=""
            onChange={(e) => e.target.value && onMove(e.target.value as Status)}
          >
            <option value="">Move to...</option>
            {targets.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      )}
    </li>
  );
}
