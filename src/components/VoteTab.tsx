"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setVotes } from "@/lib/actions";
import { formatDay } from "@/lib/format";
import { openPolls, playerName, playerVotes, votesForOption } from "@/lib/logic";
import type { Player, Poll, PublicDb } from "@/lib/types";

export function VoteTab({ db, player }: { db: PublicDb; player: Player }) {
  const polls = openPolls(db);
  if (polls.length === 0) {
    return (
      <section className="card">
        <p className="eyebrow">Voting</p>
        <h2>No dates up</h2>
        <p className="muted">When Oli opens a poll, it lands here. Vote for every night you can actually play.</p>
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
  const [selected, setSelected] = useState<string[]>(mine);
  const [pending, start] = useTransition();
  const router = useRouter();

  function toggle(optionId: string) {
    const next = selected.includes(optionId)
      ? selected.filter((id) => id !== optionId)
      : [...selected, optionId];
    setSelected(next);
    start(async () => {
      await setVotes(player.id, poll.id, next);
      router.refresh();
    });
  }

  return (
    <section className="card">
      <p className="eyebrow">Vote</p>
      <h2>{poll.title}</h2>
      <p className="muted">
        First {db.settings.spots5s} votes on the winning date are in. After that, waitlist in the order people tapped.
      </p>
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
              disabled={pending}
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
                      .map((v) => playerName(db, v.playerId).split(" ")[0])
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
