"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { setVotes } from "@/lib/actions";
import { formatDay } from "@/lib/format";
import { openPolls, playerVotes, pollLabel, votesForOption } from "@/lib/logic";
import type { Player, Poll, PublicDb } from "@/lib/types";
import { VoterList } from "./VoterList";

export function VoteTab({ db, player }: { db: PublicDb; player: Player }) {
  const polls = openPolls(db);
  if (polls.length === 0) {
    return (
      <section className="card empty">
        <h2>No poll up</h2>
        <p className="muted">When there is one, nights show here.</p>
      </section>
    );
  }
  return (
    <div className="stack gap-lg">
      {polls.map((poll) => (
        <PollCard key={poll.id} db={db} poll={poll} player={player} />
      ))}
    </div>
  );
}

function PollCard({
  db,
  poll,
  player,
}: {
  db: PublicDb;
  poll: Poll;
  player: Player;
}) {
  const mine = playerVotes(poll, player.id);
  const mineKey = mine.slice().sort().join(",");
  const [selected, setSelected] = useState<string[]>(mine);
  const selectedRef = useRef(selected);
  const ackedRef = useRef(mine);
  const queue = useRef(Promise.resolve());
  const inflight = useRef(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (inflight.current > 0) return;
    const next = playerVotes(poll, player.id);
    ackedRef.current = next;
    selectedRef.current = next;
    setSelected(next);
  }, [mineKey, poll, player.id]);

  function toggle(optionId: string) {
    const current = selectedRef.current;
    const next = current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : [...current, optionId];
    selectedRef.current = next;
    setSelected(next);
    inflight.current += 1;
    setPending(true);
    queue.current = queue.current
      .catch(() => undefined)
      .then(async () => {
        const payload = selectedRef.current;
        try {
          const res = await setVotes(player.id, poll.id, payload);
          if (res.error) {
            setError(res.error);
            selectedRef.current = ackedRef.current;
            setSelected(ackedRef.current);
            return;
          }
          setError(null);
          ackedRef.current = payload;
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Didn't save. Tap again.");
          selectedRef.current = ackedRef.current;
          setSelected(ackedRef.current);
        }
      })
      .finally(() => {
        inflight.current -= 1;
        if (inflight.current === 0) setPending(false);
      });
  }

  return (
    <section className="card">
      <h2>{pollLabel(poll)}</h2>
      <p className="muted">Every night you can play. First {db.settings.spots5s} are in.</p>
      {error && <p className="error">{error}</p>}
      <div className="stack mt-4">
        {poll.options.map((option) => {
          const votes = votesForOption(poll, option.id);
          const on = selected.includes(option.id);
          const myPlace = votes.findIndex((v) => v.playerId === player.id) + 1;
          const guaranteed = myPlace > 0 && myPlace <= db.settings.spots5s;
          return (
            <button
              key={option.id}
              type="button"
              className={`vote-row ${on ? "on" : ""}`}
              aria-pressed={on}
              aria-busy={pending}
              onClick={() => toggle(option.id)}
            >
              <div className="vote-copy">
                <span className="vote-when">{formatDay(option.date)}</span>
                {option.note && <span className="muted"> {option.note}</span>}
                <p className="tiny muted">
                  {`${votes.length} vote${votes.length === 1 ? "" : "s"}`}
                  {on && myPlace
                    ? guaranteed
                      ? ` · #${myPlace} · in if it wins`
                      : ` · #${myPlace} · waitlist if it wins`
                    : ""}
                </p>
                <VoterList db={db} votes={votes} />
              </div>
              <span className={`box ${on ? "on" : ""}`} aria-hidden>
                {on ? "×" : ""}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
