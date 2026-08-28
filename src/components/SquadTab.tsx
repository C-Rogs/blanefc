"use client";

import { formatKickoff, formatMoney, shortName } from "@/lib/format";
import {
  inSquad,
  lockedOption,
  pastGames,
  playerName,
  playingCount,
  unpaid,
  upcomingLocked,
  waitlist,
} from "@/lib/logic";
import type { Player, Poll, PublicDb, SquadMember } from "@/lib/types";
import { DateBlock } from "./Mark";

export function SquadTab({ db, player }: { db: PublicDb; player: Player }) {
  const upcoming = upcomingLocked(db);
  const past = pastGames(db);

  if (upcoming.length === 0 && past.length === 0) {
    return (
      <section className="card empty">
        <h2>No squad yet</h2>
        <p className="muted">Turns up after the date&apos;s booked.</p>
      </section>
    );
  }

  return (
    <div className="stack gap-lg">
      {upcoming.map((poll) => (
        <SquadCard key={poll.id} db={db} poll={poll} you={player.id} />
      ))}
      {past.length > 0 && (
        <>
          <h3 className="section-head">Past</h3>
          {past.map((poll) => (
            <PastCard key={poll.id} db={db} poll={poll} you={player.id} />
          ))}
        </>
      )}
    </div>
  );
}

function SquadCard({
  db,
  poll,
  you,
}: {
  db: PublicDb;
  poll: Poll;
  you: string;
}) {
  const option = lockedOption(poll)!;
  const dropped = (poll.squad ?? []).filter((m) => m.status === "dropped");
  const playing = playingCount(poll);
  return (
    <section className="card">
      <div className="also">
        <DateBlock iso={option.date} size="sm" />
        <div>
          <h2 className="kick-line">{formatKickoff(db.settings.kickoff)}</h2>
          <p className="muted">
            {playing}/{poll.spots ?? playing} · {poll.format === "7s" ? "7-a-side" : "5-a-side"} ·{" "}
            {formatMoney(poll.costPounds)} each
            {poll.pitch ? ` · Pitch ${poll.pitch}` : ""}
          </p>
        </div>
      </div>

      <h3 className="list-head">Playing</h3>
      <ul className="person-list">
        {inSquad(poll).map((m, i) => (
          <PersonRow key={m.playerId} db={db} member={m} you={you} mark={String(i + 1)} />
        ))}
      </ul>

      {waitlist(poll).length > 0 && (
        <>
          <h3 className="list-head">Waitlist</h3>
          <ul className="person-list">
            {waitlist(poll).map((m) => (
              <PersonRow
                key={m.playerId}
                db={db}
                member={m}
                you={you}
                mark={m.waitlistOrder ? `W${m.waitlistOrder}` : "W"}
              />
            ))}
          </ul>
        </>
      )}

      {dropped.length > 0 && (
        <>
          <h3 className="list-head">Out</h3>
          <ul className="person-list">
            {dropped.map((m) => (
              <PersonRow key={m.playerId} db={db} member={m} you={you} mark="x" />
            ))}
          </ul>
        </>
      )}

      {unpaid(poll).length > 0 && (
        <p className="muted tiny">
          Unpaid: {unpaid(poll).map((m) => shortName(playerName(db, m.playerId))).join(", ")}
        </p>
      )}
    </section>
  );
}

function PastCard({
  db,
  poll,
  you,
}: {
  db: PublicDb;
  poll: Poll;
  you: string;
}) {
  const option = lockedOption(poll);
  if (!option) return null;
  const playing = playingCount(poll);
  const names = inSquad(poll);
  return (
    <section className="card compact">
      <div className="also">
        <DateBlock iso={option.date} size="sm" />
        <div className="also-copy">
          <p>
            {playing} played
            {poll.spots ? ` / ${poll.spots}` : ""}
          </p>
          {names.length > 0 && (
            <p className="faces">
              {names.map((m) => shortName(playerName(db, m.playerId))).join(" · ")}
            </p>
          )}
          {names.some((m) => m.playerId === you) && (
            <p className="tiny muted">You played</p>
          )}
        </div>
      </div>
    </section>
  );
}

function PersonRow({
  db,
  member,
  you,
  mark,
}: {
  db: PublicDb;
  member: SquadMember;
  you: string;
  mark: string;
}) {
  const name = playerName(db, member.playerId);
  return (
    <li className={`person ${member.playerId === you ? "you" : ""}`}>
      <span className="shirt sm">{mark}</span>
      <span className="person-name">
        {name}
        {member.playerId === you ? " (you)" : ""}
      </span>
      <span className={`chip ${chipClass(member)}`}>{chipLabel(member)}</span>
    </li>
  );
}

function chipLabel(member: SquadMember): string {
  if (member.status === "dropped") return member.stillOwes ? "owes" : "out";
  if (member.status === "waitlist") return "wait";
  return member.paid ? "paid" : "unpaid";
}

function chipClass(member: SquadMember): string {
  if (member.status === "dropped") return member.stillOwes ? "chip-warn" : "chip-muted";
  if (member.status === "waitlist") return "chip-wait";
  return member.paid ? "chip-ok" : "chip-warn";
}
