"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { setVotes } from "@/lib/actions";
import { formatDay, shortName } from "@/lib/format";
import { openPolls, playerName, playerVotes, votesForOption } from "@/lib/logic";
import type { Player, Poll, PublicDb } from "@/lib/types";

export function VoteTab({ db, player }: { db: PublicDb; player: Player }) {
  const polls = openPolls(db);
  if (polls.length === 0) {
    return (
      <section className="card">
        <p className="eyebrow">Voting</p>
        <h2>No dates to vote on</h2>
        <p className="muted">
          Locked games sit on Home. When a poll opens for the next booking, it
          lands here. Vote every night you can actually play.
        </p>
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
          setError(err instanceof Error ? err.message : "That didn't save. Tap again.");
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
      <p className="eyebrow">Open poll</p>
      <h2>{poll.title}</h2>
      <p className="muted">
        Not booked yet. First {db.settings.spots5s} votes on the winning date are in.
        After that, waitlist. The date locks when the pitch is booked.
      </p>
      {error && <p className="error">{error}</p>}
      <div className="stack">
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
              <div>
                <strong>{formatDay(option.date)}</strong>
                {option.note && <span className="muted"> · {option.note}</span>}
                <p className="tiny muted">
                  {`${votes.length} vote${votes.length === 1 ? "" : "s"}`}
                  {on && myPlace
                    ? guaranteed
                      ? ` · you're #${myPlace} (in if this date wins)`
                      : ` · you're #${myPlace} (waitlist if this date wins)`
                    : ""}
                </p>
                {votes.length > 0 && (
                  <p className="faces">
                    {votes
                      .slice(0, 8)
                      .map((v) => shortName(playerName(db, v.playerId)))
                      .join(" · ")}
                    {votes.length > 8 ? " …" : ""}
                  </p>
                )}
              </div>
              <span className={`tick ${on ? "on" : ""}`}>{on ? "In" : "Tap"}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
