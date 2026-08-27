"use client";

import { useState } from "react";
import { dropOut, ivePaid, takeSpot } from "@/lib/actions";
import { formatDay, formatKickoff, formatMoney } from "@/lib/format";
import {
  inSquad,
  lockedOption,
  memberFor,
  nextGame,
  openPolls,
  openSpots,
  playerName,
  playingCount,
  unpaid,
  upcomingLocked,
  waitlist,
} from "@/lib/logic";
import type { Player, Poll, PublicDb } from "@/lib/types";
import { ActionButton, CopyButton } from "./Buttons";

export function HomeTab({
  db,
  player,
  onVote,
}: {
  db: PublicDb;
  player: Player;
  onVote: () => void;
}) {
  const game = nextGame(db);
  const others = upcomingLocked(db).filter((p) => p.id !== game?.id);
  const polls = openPolls(db);

  return (
    <div className="stack gap-lg">
      {game ? (
        <GameCard db={db} poll={game} player={player} />
      ) : (
        <section className="card">
          <p className="eyebrow">Next game</p>
          <h2>Nothing booked yet</h2>
          <p className="muted">Oli will lock a date once votes are in.</p>
        </section>
      )}

      {polls.length > 0 && (
        <section className="card">
          <p className="eyebrow">Dates up</p>
          <h2>{polls[0].title}</h2>
          <p className="muted">
            Vote for every night you can do. First votes get the spots.
          </p>
          <button type="button" className="btn btn-lime" onClick={onVote}>
            Vote now
          </button>
        </section>
      )}

      {others.map((poll) => {
        const option = lockedOption(poll);
        if (!option) return null;
        const mine = memberFor(poll, player.id);
        return (
          <section key={poll.id} className="card compact">
            <p className="eyebrow">Also booked</p>
            <h3>
              {formatDay(option.date)} · {playingCount(poll)}/{poll.spots}
            </h3>
            <p className="muted">
              {mine?.status === "in"
                ? "You're in"
                : mine?.status === "waitlist"
                  ? `Waitlist #${mine.waitlistOrder}`
                  : openSpots(poll) > 0
                    ? `${openSpots(poll)} space left`
                    : "Full"}
            </p>
          </section>
        );
      })}
    </div>
  );
}

function GameCard({
  db,
  poll,
  player,
}: {
  db: PublicDb;
  poll: Poll;
  player: Player;
}) {
  const option = lockedOption(poll);
  if (!option) return null;
  const mine = memberFor(poll, player.id);
  const spotsLeft = openSpots(poll);
  const nextWait = waitlist(poll)[0];
  const payText = paymentDetails(db, poll);

  return (
    <section className="card hero">
      <p className="eyebrow">Next up</p>
      <h2 className="display-sm">{formatDay(option.date)}</h2>
      <p className="hero-meta">
        {formatKickoff(db.settings.kickoff)} · {db.settings.venueName}
        {poll.pitch ? ` · Pitch ${poll.pitch}` : ""}
      </p>

      <StatusBanner mine={mine} spotsLeft={spotsLeft} spots={poll.spots ?? 12} playing={playingCount(poll)} />

      <div className="meter" aria-hidden>
        <span style={{ width: `${(playingCount(poll) / (poll.spots ?? 12)) * 100}%` }} />
      </div>
      <p className="muted">
        {playingCount(poll)}/{poll.spots} in
        {waitlist(poll).length > 0 ? ` · ${waitlist(poll).length} waiting` : ""}
        {spotsLeft > 0 ? ` · ${spotsLeft} open` : ""}
      </p>

      <PlayerActions
        db={db}
        poll={poll}
        playerId={player.id}
        mine={mine}
        spotsLeft={spotsLeft}
        nextWaitName={nextWait ? playerName(db, nextWait.playerId) : null}
      />

      {mine?.status === "in" && !mine.paid && (
        <div className="pay-box">
          <p className="pay-title">
            Send {formatMoney(poll.costPounds)} to {db.settings.payeeName}
          </p>
          {db.settings.sortCode ? (
            <p className="mono">
              {db.settings.sortCode} · {db.settings.accountNumber}
            </p>
          ) : (
            <p className="muted">Bank details live in the WhatsApp until Oli pastes them here.</p>
          )}
          <div className="row">
            <CopyButton text={payText} label="Copy pay details" />
            <ActionButton variant="lime" onClick={() => ivePaid(player.id, poll.id)}>
              I&apos;ve paid
            </ActionButton>
          </div>
        </div>
      )}

      {mine?.status === "in" && mine.paid && (
        <p className="ok">Paid. See you there.</p>
      )}

      {unpaid(poll).length > 0 && mine?.status === "in" && (
        <p className="muted tiny">
          {unpaid(poll).length} still to pay, including{" "}
          {unpaid(poll)[0].playerId === player.id
            ? "you."
            : `${playerName(db, unpaid(poll)[0].playerId)}.`}
        </p>
      )}

      {inSquad(poll).length > 0 && (
        <p className="faces">
          {inSquad(poll)
            .slice(0, 12)
            .map((m) => playerName(db, m.playerId).split(" ")[0])
            .join(" · ")}
        </p>
      )}

      {db.settings.venueMapsUrl && (
        <a className="link" href={db.settings.venueMapsUrl} target="_blank" rel="noreferrer">
          Map to the pitches
        </a>
      )}
    </section>
  );
}

function StatusBanner({
  mine,
  spotsLeft,
  spots,
  playing,
}: {
  mine: ReturnType<typeof memberFor>;
  spotsLeft: number;
  spots: number;
  playing: number;
}) {
  if (mine?.status === "in") {
    return <div className={`banner ${mine.paid ? "banner-ok" : "banner-in"}`}>You&apos;re in</div>;
  }
  if (mine?.status === "waitlist") {
    return (
      <div className="banner banner-wait">
        Waitlist #{mine.waitlistOrder}
      </div>
    );
  }
  if (mine?.status === "dropped") {
    return (
      <div className="banner banner-out">
        {mine.stillOwes ? "Dropped - still owing unless someone takes it" : "You're out"}
      </div>
    );
  }
  if (spotsLeft > 0) {
    return (
      <div className="banner banner-open">
        {spotsLeft} space{spotsLeft === 1 ? "" : "s"} · {playing}/{spots}
      </div>
    );
  }
  return <div className="banner banner-full">Full · waitlist open</div>;
}

function PlayerActions({
  poll,
  playerId,
  mine,
  spotsLeft,
  nextWaitName,
}: {
  db: PublicDb;
  poll: Poll;
  playerId: string;
  mine: ReturnType<typeof memberFor>;
  spotsLeft: number;
  nextWaitName: string | null;
}) {
  const [confirmDrop, setConfirmDrop] = useState(false);

  if (mine?.status === "in") {
    return confirmDrop ? (
      <div className="stack">
        <p className="warn">
          {nextWaitName
            ? `We'll give your spot to ${nextWaitName}.`
            : `No one on the waitlist. If nobody takes it, you still owe ${formatMoney(poll.costPounds)}.`}
        </p>
        <div className="row">
          <ActionButton variant="danger" onClick={() => dropOut(playerId, poll.id)}>
            Yes, drop me
          </ActionButton>
          <button type="button" className="btn btn-ghost" onClick={() => setConfirmDrop(false)}>
            Stay in
          </button>
        </div>
      </div>
    ) : (
      <button type="button" className="btn btn-ghost" onClick={() => setConfirmDrop(true)}>
        Can&apos;t make it
      </button>
    );
  }

  if (mine?.status === "waitlist") {
    return spotsLeft > 0 ? (
      <ActionButton onClick={() => takeSpot(playerId, poll.id)}>Take the open spot</ActionButton>
    ) : (
      <p className="muted">If someone drops, you&apos;re next.</p>
    );
  }

  if (spotsLeft > 0) {
    return <ActionButton variant="lime" onClick={() => takeSpot(playerId, poll.id)}>I&apos;ll take a spot</ActionButton>;
  }

  return (
    <ActionButton variant="ghost" onClick={() => takeSpot(playerId, poll.id)}>
      Join waitlist
    </ActionButton>
  );
}

function paymentDetails(db: PublicDb, poll: Poll): string {
  return [
    `${formatMoney(poll.costPounds)} to ${db.settings.payeeName}`,
    db.settings.sortCode && `Sort: ${db.settings.sortCode}`,
    db.settings.accountNumber && `Acc: ${db.settings.accountNumber}`,
  ]
    .filter(Boolean)
    .join("\n");
}
