"use client";

import { formatDay, formatKickoff, formatMoney, initials } from "@/lib/format";
import {
  inSquad,
  lockedOption,
  nextGame,
  playerName,
  unpaid,
  waitlist,
} from "@/lib/logic";
import type { Player, Poll, PublicDb, SquadMember } from "@/lib/types";

export function SquadTab({ db, player }: { db: PublicDb; player: Player }) {
  const game = nextGame(db);
  if (!game || !lockedOption(game)) {
    return (
      <section className="card">
        <p className="eyebrow">Squad</p>
        <h2>No locked game</h2>
        <p className="muted">The list appears once a date is booked.</p>
      </section>
    );
  }
  return <SquadCard db={db} poll={game} you={player.id} />;
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
  return (
    <section className="card">
      <p className="eyebrow">Squad</p>
      <h2>
        {formatDay(option.date)} · {formatKickoff(db.settings.kickoff)}
      </h2>
      <p className="muted">
        {poll.format === "7s" ? "7-a-side" : "5-a-side"} · {formatMoney(poll.costPounds)} each
        {poll.pitch ? ` · Pitch ${poll.pitch}` : ""}
      </p>

      <h3 className="list-head">Playing</h3>
      <ul className="person-list">
        {inSquad(poll).map((m) => (
          <PersonRow key={m.playerId} db={db} member={m} you={you} />
        ))}
      </ul>

      {waitlist(poll).length > 0 && (
        <>
          <h3 className="list-head">Waitlist</h3>
          <ul className="person-list">
            {waitlist(poll).map((m) => (
              <PersonRow key={m.playerId} db={db} member={m} you={you} />
            ))}
          </ul>
        </>
      )}

      {dropped.length > 0 && (
        <>
          <h3 className="list-head">Out</h3>
          <ul className="person-list">
            {dropped.map((m) => (
              <PersonRow key={m.playerId} db={db} member={m} you={you} />
            ))}
          </ul>
        </>
      )}

      {unpaid(poll).length > 0 && (
        <p className="muted tiny">
          Unpaid: {unpaid(poll).map((m) => playerName(db, m.playerId).split(" ")[0]).join(", ")}
        </p>
      )}
    </section>
  );
}

function PersonRow({
  db,
  member,
  you,
}: {
  db: PublicDb;
  member: SquadMember;
  you: string;
}) {
  const name = playerName(db, member.playerId);
  return (
    <li className={`person ${member.playerId === you ? "you" : ""}`}>
      <span className="avatar sm">{initials(name)}</span>
      <span className="person-name">
        {name}
        {member.playerId === you ? " (you)" : ""}
        {member.status === "waitlist" && member.waitlistOrder
          ? ` · #${member.waitlistOrder}`
          : ""}
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
