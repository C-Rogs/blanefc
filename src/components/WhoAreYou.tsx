"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { phoneDigits } from "@/lib/format";
import type { Player } from "@/lib/types";
import { Crest } from "./Mark";

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

  useEffect(() => {
    if (!adding) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAdding(false);
        setError(null);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [adding]);

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
      <header className="picker-head">
        <div className="brand">
          <Crest size={34} />
          <h1 className="club">{clubName}</h1>
        </div>
      </header>

      <input
        className="field"
        placeholder="Name or number"
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
            <span className="name-card-label">{player.name}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="muted center">Nobody by that name. Add yourself.</p>
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
          <div className="row">
            <button className="btn btn-primary" type="submit" disabled={pending}>
              {pending ? "Adding..." : "That's me"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn btn-ghost mt-4" onClick={() => setAdding(true)}>
          Not on the list
        </button>
      )}
    </div>
  );
}
