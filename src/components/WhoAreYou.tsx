"use client";

import { useMemo, useState, useTransition } from "react";
import { initials, isPhoneName, phoneDigits } from "@/lib/format";
import type { Player } from "@/lib/types";

export function WhoAreYou({
  clubName,
  players,
  onPick,
  onCreate,
}: {
  clubName: string;
  players: Player[];
  onPick: (player: Player) => void;
  onCreate: (name: string) => Promise<{ error?: string }>;
}) {
  const [q, setQ] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const digits = phoneDigits(needle);
    return players.filter((p) => {
      if (!needle) return true;
      if (p.name.toLowerCase().includes(needle)) return true;
      return digits.length >= 3 && phoneDigits(p.name).includes(digits);
    });
  }, [players, q]);

  return (
    <div className="screen">
      <header className="pt-8 pb-6 pr-12">
        <p className="eyebrow">{clubName}</p>
        <h1 className="display">Who are you?</h1>
        <p className="lede">Tap your name or number. No password. Takes two seconds.</p>
      </header>

      <input
        className="field"
        placeholder="Search name or number"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
      />

      <div className="name-grid">
        {filtered.map((player) => (
          <button
            key={player.id}
            type="button"
            className="name-card"
            disabled={pending}
            onClick={() => onPick(player)}
          >
            <span className={`avatar${isPhoneName(player.name) ? " phone" : ""}`}>
              {initials(player.name)}
            </span>
            <span className="name-card-label">{player.name}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="muted center">No match. Add yourself below.</p>
      )}

      {adding ? (
        <form
          className="stack mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await onCreate(newName);
              setError(res.error ?? null);
            });
          }}
        >
          <input
            className="field"
            placeholder="Your name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? "Adding..." : "That's me"}
          </button>
        </form>
      ) : (
        <button type="button" className="btn btn-ghost mt-4" onClick={() => setAdding(true)}>
          I&apos;m new here
        </button>
      )}
    </div>
  );
}
