"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addPlayer } from "@/lib/actions";
import { activePlayers } from "@/lib/logic";
import type { Player, PublicDb } from "@/lib/types";
import { AdminTab } from "./AdminTab";
import { HomeTab } from "./HomeTab";
import { SquadTab } from "./SquadTab";
import { VoteTab } from "./VoteTab";
import { WhoAreYou } from "./WhoAreYou";

const PLAYER_KEY = "nk_player_id";
const PIN_KEY = "nk_organiser_pin";

type Tab = "home" | "vote" | "squad" | "oli";

export function App({ db }: { db: PublicDb }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("home");

  useEffect(() => {
    setPlayerId(window.localStorage.getItem(PLAYER_KEY));
    setPin(window.localStorage.getItem(PIN_KEY));
    setReady(true);
  }, []);

  const players = activePlayers(db);
  const player = players.find((p) => p.id === playerId) ?? null;

  function pick(next: Player | string) {
    const id = typeof next === "string" ? next : next.id;
    window.localStorage.setItem(PLAYER_KEY, id);
    setPlayerId(id);
    router.refresh();
  }

  function clearPlayer() {
    window.localStorage.removeItem(PLAYER_KEY);
    setPlayerId(null);
    setTab("home");
  }

  async function createAndPick(name: string) {
    const res = await addPlayer(name);
    if (res.error || !res.id) return res;
    pick(res.id);
    return res;
  }

  if (!ready) {
    return (
      <div className="screen">
        <p className="eyebrow">No Knees FC</p>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (!player) {
    return <WhoAreYou players={players} onPick={pick} onCreate={createAndPick} />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">No Knees FC</p>
          <p className="who">
            {player.name}{" "}
            <button type="button" className="text-btn" onClick={clearPlayer}>
              Not you?
            </button>
          </p>
        </div>
      </header>

      <main className="main">
        {tab === "home" && <HomeTab db={db} player={player} onVote={() => setTab("vote")} />}
        {tab === "vote" && <VoteTab db={db} player={player} />}
        {tab === "squad" && <SquadTab db={db} player={player} />}
        {tab === "oli" && (
          <AdminTab
            db={db}
            pin={pin}
            onUnlock={(nextPin) => {
              window.localStorage.setItem(PIN_KEY, nextPin);
              setPin(nextPin);
            }}
            onLock={() => {
              window.localStorage.removeItem(PIN_KEY);
              setPin(null);
            }}
          />
        )}
      </main>

      <nav className="dock">
        <DockButton label="Home" active={tab === "home"} onClick={() => setTab("home")} />
        <DockButton label="Vote" active={tab === "vote"} onClick={() => setTab("vote")} />
        <DockButton label="Squad" active={tab === "squad"} onClick={() => setTab("squad")} />
        <DockButton label="Oli" active={tab === "oli"} onClick={() => setTab("oli")} />
      </nav>
    </div>
  );
}

function DockButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`dock-btn ${active ? "on" : ""}`} onClick={onClick}>
      {label}
    </button>
  );
}
