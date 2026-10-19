"use client";

import { useEffect, useState } from "react";
import { dropOut, ivePaid, takeSpot } from "@/lib/actions";
import { formatDay, formatKickoff, formatMoney, shortName } from "@/lib/format";
import {
  inSquad,
  lockedOption,
  memberFor,
  nextGame,
  openPolls,
  openSpots,
  playerName,
  playingCount,
  pollLabel,
  unpaid,
  upcomingLocked,
  votesForOption,
  waitlist,
} from "@/lib/logic";
import type { Player, Poll, PublicDb } from "@/lib/types";
import { ActionButton, CopyButton } from "./Buttons";
import { DateBlock, MapPin } from "./Mark";
import { VoterList } from "./VoterList";

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
  const poll = openPolls(db)[0];

  return (
    <div className="stack gap-lg">
      {game ? (
        <GameCard db={db} poll={game} player={player} />
      ) : (
        <section className="card empty">
          <h2>No game yet</h2>
          <p className="muted">Vote first. Locks when the pitch is booked.</p>
        </section>
      )}

      {poll && (
        <section className="card">
          <h2>{pollLabel(poll)}</h2>
          <p className="muted">Tap the nights you can do.</p>
          <div className="stack mt-4">
            {poll.options.map((option) => {
              const votes = votesForOption(poll, option.id);
              return (
                <div key={option.id} className="vote-preview">
                  <p className="vote-preview-day">
                    {formatDay(option.date)}
                    <span className="muted">
                      {" "}
                      · {votes.length} vote{votes.length === 1 ? "" : "s"}
                    </span>
                  </p>
                  <VoterList db={db} votes={votes} />
                </div>
              );
            })}
          </div>
          <button type="button" className="btn btn-lime mt-4" onClick={onVote}>
            Vote
          </button>
        </section>
      )}

      {others.map((poll) => (
        <AlsoLockedCard key={poll.id} db={db} poll={poll} player={player} />
      ))}
    </div>
  );
}

function AlsoLockedCard({
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
  const waiting = waitlist(poll).length;

  let status = "Full";
  if (mine?.status === "in") status = "You're in";
  else if (mine?.status === "waitlist") status = `Waitlist #${mine.waitlistOrder}`;
  else if (spotsLeft > 0 && waiting > 0) status = `${spotsLeft} open · waitlist first`;
  else if (spotsLeft > 0) status = `${spotsLeft} space${spotsLeft === 1 ? "" : "s"}`;

  return (
    <section className="card compact">
      <div className="also">
        <DateBlock iso={option.date} size="sm" />
        <div className="also-copy">
          <p className="muted">
            {playingCount(poll)}/{poll.spots} · {status}
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
            <div className="row">
              <CopyButton text={paymentDetails(db, poll)} label="Copy bank" />
              <ActionButton variant="lime" onClick={() => ivePaid(player.id, poll.id)}>
                I&apos;ve paid
              </ActionButton>
            </div>
          )}
        </div>
      </div>
    </section>
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
  const playing = playingCount(poll);
  const spots = poll.spots ?? 12;

  return (
    <section className="card hero">
      <div className="fixture">
        <DateBlock iso={option.date} />
        <div className="fixture-copy">
          <p className="kick">{formatKickoff(db.settings.kickoff)}</p>
          <p className="venue">
            {db.settings.venueName}
            {poll.pitch ? ` · Pitch ${poll.pitch}` : ""}
          </p>
          <StatusBanner
            mine={mine}
            spotsLeft={spotsLeft}
            spots={spots}
            playing={playing}
            waiting={waitlist(poll).length}
          />
          <div className="pips" aria-hidden>
            {Array.from({ length: spots }, (_, i) => (
              <span key={i} className={i < playing ? "on" : ""} />
            ))}
          </div>
          <p className="muted tiny">
            {playing}/{spots}
            {waitlist(poll).length > 0 ? ` · ${waitlist(poll).length} waiting` : ""}
            {spotsLeft > 0 ? ` · ${spotsLeft} open` : ""}
          </p>
        </div>
      </div>

      <div className="hero-body">
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
              {formatMoney(poll.costPounds)} to {db.settings.payeeName}
            </p>
            {db.settings.sortCode ? (
              <p className="mono">
                {db.settings.sortCode} · {db.settings.accountNumber}
              </p>
            ) : (
              <p className="muted">No bank details yet.</p>
            )}
            <div className="row">
              <CopyButton text={payText} label="Copy bank" />
              <ActionButton variant="lime" onClick={() => ivePaid(player.id, poll.id)}>
                I&apos;ve paid
              </ActionButton>
            </div>
          </div>
        )}

        {mine?.status === "in" && mine.paid && <p className="ok">Paid. See you there.</p>}

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
              .map((m) => shortName(playerName(db, m.playerId)))
              .join(" · ")}
          </p>
        )}

        {db.settings.venueMapsUrl && (
          <a className="link map-link" href={db.settings.venueMapsUrl} target="_blank" rel="noreferrer">
            <MapPin />
            Directions
          </a>
        )}
      </div>
    </section>
  );
}

function StatusBanner({
  mine,
  spotsLeft,
  spots,
  playing,
  waiting,
}: {
  mine: ReturnType<typeof memberFor>;
  spotsLeft: number;
  spots: number;
  playing: number;
  waiting: number;
}) {
  if (mine?.status === "in") {
    return <div className={`banner ${mine.paid ? "banner-ok" : "banner-in"}`}>You&apos;re in</div>;
  }
  if (mine?.status === "waitlist") {
    if (spotsLeft > 0 && mine.waitlistOrder === 1) {
      return <div className="banner banner-wait">You&apos;re first · spot&apos;s free</div>;
    }
    return <div className="banner banner-wait">Waitlist #{mine.waitlistOrder}</div>;
  }
  if (mine?.status === "dropped") {
    return (
      <div className="banner banner-out">
        {mine.stillOwes ? "Out · still owe unless someone takes it" : "You're out"}
      </div>
    );
  }
  if (spotsLeft > 0) {
    return (
      <div className="banner banner-open">
        {spotsLeft} space{spotsLeft === 1 ? "" : "s"}
        {waiting > 0 ? " · waitlist first" : ` · ${playing}/${spots}`}
      </div>
    );
  }
  return <div className="banner banner-full">Full · waitlist going</div>;
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

  useEffect(() => {
    if (!confirmDrop) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setConfirmDrop(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirmDrop]);

  if (mine?.status === "in") {
    return confirmDrop ? (
      <div className="stack">
        <p className="warn">
          {nextWaitName
            ? `Spot goes to ${nextWaitName}.`
            : `Nobody waiting. If no one takes it, you still owe ${formatMoney(poll.costPounds)}.`}
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
    return (
      <div className="stack">
        {spotsLeft > 0 && mine.waitlistOrder === 1 ? (
          <ActionButton variant="lime" onClick={() => takeSpot(playerId, poll.id)}>
            I&apos;ll take it
          </ActionButton>
        ) : spotsLeft > 0 ? (
          <p className="muted">
            {nextWaitName ? `${nextWaitName} is first.` : "Waitlist goes first."} You&apos;re #
            {mine.waitlistOrder}.
          </p>
        ) : (
          <p className="muted">
            {mine.waitlistOrder === 1
              ? "If someone drops, you're next."
              : `You're #${mine.waitlistOrder} on the waitlist.`}
          </p>
        )}
        <ActionButton variant="ghost" onClick={() => dropOut(playerId, poll.id)}>
          Take me off
        </ActionButton>
      </div>
    );
  }

  if (spotsLeft > 0 && !nextWaitName) {
    return (
      <ActionButton variant="lime" onClick={() => takeSpot(playerId, poll.id)}>
        I&apos;ll take a spot
      </ActionButton>
    );
  }

  return (
    <ActionButton variant="ghost" onClick={() => takeSpot(playerId, poll.id)}>
      Put me down
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
