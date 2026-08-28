"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addGuest,
  adminDrop,
  createPoll,
  deactivatePlayer,
  lockDate,
  markPaid,
  setPitch,
  unlockOrganiser,
  updateSettings,
} from "@/lib/actions";
import { formatDay, formatMoney, shortName } from "@/lib/format";
import {
  activePlayers,
  inSquad,
  lockedOption,
  nextGame,
  openPolls,
  playerName,
  unpaid,
  upcomingLocked,
  votesForOption,
  waitlist,
} from "@/lib/logic";
import {
  lockedMessage,
  matchDayMessage,
  paymentMessage,
  pollMessage,
  spotFreeMessage,
} from "@/lib/messages";
import type { Poll, PublicDb } from "@/lib/types";
import { ActionButton, CopyButton, WhatsAppButton } from "./Buttons";

export function AdminTab({
  db,
  pin,
  onUnlock,
  onLock,
}: {
  db: PublicDb;
  pin: string | null;
  onUnlock: (pin: string) => void;
  onLock: () => void;
}) {
  if (!pin) return <PinGate onUnlock={onUnlock} />;
  return (
    <div className="stack gap-lg">
      <WhatsAppPack db={db} />
      <LockPanel db={db} pin={pin} />
      <CreatePoll pin={pin} />
      {upcomingLocked(db).map((poll) => (
        <GameAdmin key={poll.id} db={db} pin={pin} poll={poll} />
      ))}
      <PlayersAdmin db={db} pin={pin} />
      <SettingsForm db={db} pin={pin} />
      <button type="button" className="btn btn-ghost" onClick={onLock}>
        Lock admin
      </button>
    </div>
  );
}

function PinGate({ onUnlock }: { onUnlock: (pin: string) => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <section className="card">
      <p className="eyebrow">Admin</p>
      <h2>Organiser tools</h2>
      <p className="muted">
        PIN keeps the rest of the lads from editing polls and payments.
      </p>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await unlockOrganiser(pin);
            if (res.error) setError(res.error);
            else onUnlock(pin);
          });
        }}
      >
        <input
          className="field"
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
        />
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={pending}>
          Unlock
        </button>
      </form>
    </section>
  );
}

function WhatsAppPack({ db }: { db: PublicDb }) {
  const games = upcomingLocked(db);
  const next = nextGame(db);
  const poll = openPolls(db)[0];
  const items: { label: string; text: string }[] = [];
  if (poll) items.push({ label: "New poll", text: pollMessage(db, poll) });
  for (const game of games) {
    const option = lockedOption(game);
    const day = option ? formatDay(option.date) : "locked";
    items.push({ label: `Date locked · ${day}`, text: lockedMessage(db, game) });
    items.push({ label: `Chase unpaid · ${day}`, text: paymentMessage(db, game) });
    items.push({ label: `Spot free · ${day}`, text: spotFreeMessage(db, game) });
  }
  if (next) items.push({ label: "Match day", text: matchDayMessage(db, next) });
  if (items.length === 0) return null;
  return (
    <section className="card">
      <p className="eyebrow">WhatsApp</p>
      <h2>Paste into the group</h2>
      <p className="muted">
        Copy or open WhatsApp. The group stays the chat. This stays the source of truth.
      </p>
      <div className="stack">
        {items.map((item) => (
          <article key={item.label} className="wa-card">
            <div className="wa-head">
              <strong>{item.label}</strong>
              <div className="row tight">
                <CopyButton text={item.text} />
                <WhatsAppButton text={item.text} />
              </div>
            </div>
            <pre>{item.text}</pre>
          </article>
        ))}
      </div>
    </section>
  );
}

function LockPanel({ db, pin }: { db: PublicDb; pin: string }) {
  const polls = openPolls(db);
  if (polls.length === 0) return null;
  return (
    <>
      {polls.map((poll) => (
        <section key={poll.id} className="card">
          <p className="eyebrow">Book a date</p>
          <h2>{poll.title}</h2>
          {poll.options.map((option) => {
            const votes = votesForOption(poll, option.id);
            return (
              <div key={option.id} className="lock-option">
                <div>
                  <strong>
                    {formatDay(option.date)} · {votes.length} votes
                  </strong>
                  <p className="tiny muted">
                    {votes.map((v) => shortName(playerName(db, v.playerId))).join(" · ") ||
                      "No votes yet"}
                  </p>
                </div>
                <div className="row tight">
                  <ActionButton onClick={() => lockDate(pin, poll.id, option.id, "5s")}>
                    Book 5s
                  </ActionButton>
                  <ActionButton
                    variant="ghost"
                    onClick={() => lockDate(pin, poll.id, option.id, "7s")}
                  >
                    Book 7s
                  </ActionButton>
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </>
  );
}

function CreatePoll({ pin }: { pin: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("Next session");
  const [dates, setDates] = useState([
    { date: "", note: "5s and 7s" },
    { date: "", note: "5s and 7s" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <section className="card">
      <p className="eyebrow">New poll</p>
      <h2>Ask the dates</h2>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await createPoll(pin, { title, dates });
            setError(res.error ?? null);
            if (!res.error) {
              setDates([
                { date: "", note: "5s and 7s" },
                { date: "", note: "5s and 7s" },
              ]);
              router.refresh();
            }
          });
        }}
      >
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} />
        {dates.map((row, i) => (
          <div key={i} className="row">
            <input
              className="field"
              type="date"
              value={row.date}
              onChange={(e) =>
                setDates(dates.map((d, j) => (j === i ? { ...d, date: e.target.value } : d)))
              }
            />
            <input
              className="field"
              placeholder="5s / 7s note"
              value={row.note}
              onChange={(e) =>
                setDates(dates.map((d, j) => (j === i ? { ...d, note: e.target.value } : d)))
              }
            />
          </div>
        ))}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setDates([...dates, { date: "", note: "" }])}
        >
          Add a date
        </button>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={pending}>
          Put poll up
        </button>
      </form>
    </section>
  );
}

function GameAdmin({
  db,
  pin,
  poll: game,
}: {
  db: PublicDb;
  pin: string;
  poll: Poll;
}) {
  const router = useRouter();
  const option = lockedOption(game);
  const [pitch, setPitchValue] = useState(game.pitch ?? "");
  const [guest, setGuest] = useState("");
  const [guestError, setGuestError] = useState<string | null>(null);
  const [pitchError, setPitchError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!option) return null;

  return (
    <section className="card">
      <p className="eyebrow">This game</p>
      <h2>{formatDay(option.date)}</h2>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await setPitch(pin, game.id, pitch);
            setPitchError(res.error ?? null);
            if (!res.error) router.refresh();
          });
        }}
      >
        <input
          className="field"
          placeholder="Pitch number"
          value={pitch}
          onChange={(e) => setPitchValue(e.target.value)}
        />
        <button className="btn btn-ghost" type="submit" disabled={pending}>
          Save
        </button>
      </form>
      {pitchError && <p className="error tiny">{pitchError}</p>}

      <h3 className="list-head">Paid?</h3>
      <ul className="person-list">
        {inSquad(game).map((m) => (
          <li key={m.playerId} className="person">
            <span className="person-name">{playerName(db, m.playerId)}</span>
            <button
              type="button"
              className={`chip ${m.paid ? "chip-ok" : "chip-warn"}`}
              onClick={() =>
                start(async () => {
                  await markPaid(pin, game.id, m.playerId, !m.paid);
                  router.refresh();
                })
              }
            >
              {m.paid ? "paid" : "unpaid"}
            </button>
            <ActionButton variant="ghost" onClick={() => adminDrop(pin, game.id, m.playerId)}>
              Drop
            </ActionButton>
          </li>
        ))}
      </ul>
      {waitlist(game).length > 0 && (
        <>
          <h3 className="list-head">Waitlist</h3>
          <ul className="person-list">
            {waitlist(game).map((m) => (
              <li key={m.playerId} className="person">
                <span className="person-name">
                  {playerName(db, m.playerId)}
                  {m.waitlistOrder ? ` · #${m.waitlistOrder}` : ""}
                </span>
                <ActionButton variant="ghost" onClick={() => adminDrop(pin, game.id, m.playerId)}>
                  Drop
                </ActionButton>
              </li>
            ))}
          </ul>
        </>
      )}
      {unpaid(game).length > 0 && (
        <p className="muted tiny">
          Still {formatMoney(game.costPounds)} from {unpaid(game).length} people.
        </p>
      )}

      <form
        className="row mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await addGuest(pin, game.id, guest);
            setGuestError(res.error ?? null);
            if (!res.error) setGuest("");
            router.refresh();
          });
        }}
      >
        <input
          className="field"
          placeholder="Guest name"
          value={guest}
          onChange={(e) => setGuest(e.target.value)}
        />
        <button className="btn btn-ghost" type="submit" disabled={pending}>
          Add guest
        </button>
      </form>
      {guestError && <p className="error tiny">{guestError}</p>}
    </section>
  );
}

function PlayersAdmin({ db, pin }: { db: PublicDb; pin: string }) {
  return (
    <section className="card">
      <p className="eyebrow">Squad list</p>
      <h2>{db.players.filter((p) => p.active).length} active</h2>
      <ul className="person-list">
        {activePlayers(db).map((p) => (
            <li key={p.id} className="person">
              <span className="person-name">{p.name}</span>
              {p.id !== "p-oli" && (
                <ActionButton variant="ghost" onClick={() => deactivatePlayer(pin, p.id)}>
                  Hide
                </ActionButton>
              )}
            </li>
          ))}
      </ul>
    </section>
  );
}

function SettingsForm({ db, pin }: { db: PublicDb; pin: string }) {
  const router = useRouter();
  const [form, setForm] = useState({
    clubName: db.settings.clubName,
    payeeName: db.settings.payeeName,
    sortCode: db.settings.sortCode,
    accountNumber: db.settings.accountNumber,
    venueName: db.settings.venueName,
    venueMapsUrl: db.settings.venueMapsUrl,
    kickoff: db.settings.kickoff,
    defaultCostPounds: db.settings.defaultCostPounds,
    pin: "",
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <section className="card">
      <p className="eyebrow">Settings</p>
      <h2>Club, venue and pay</h2>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await updateSettings(pin, form);
            setError(res.error ?? null);
            if (res.error) return;
            setSaved(true);
            router.refresh();
            setTimeout(() => setSaved(false), 1500);
          });
        }}
      >
        {(
          [
            ["clubName", "Club name"],
            ["payeeName", "Payee name"],
            ["sortCode", "Sort code"],
            ["accountNumber", "Account number"],
            ["venueName", "Venue"],
            ["venueMapsUrl", "Maps link"],
            ["kickoff", "Kickoff"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="label">
            {label}
            <input
              className="field"
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </label>
        ))}
        <label className="label">
          Cost (£)
          <input
            className="field"
            type="number"
            value={form.defaultCostPounds}
            onChange={(e) =>
              setForm({ ...form, defaultCostPounds: Number(e.target.value) })
            }
          />
        </label>
        <label className="label">
          New PIN (optional)
          <input
            className="field"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            value={form.pin}
            onChange={(e) => setForm({ ...form, pin: e.target.value })}
            placeholder="Leave blank to keep"
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {saved ? "Saved" : "Save settings"}
        </button>
      </form>
    </section>
  );
}
