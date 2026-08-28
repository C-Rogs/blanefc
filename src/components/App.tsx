"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addPlayer } from "@/lib/actions";
import { activePlayers } from "@/lib/logic";
import type { Player, PublicDb } from "@/lib/types";
import { AdminTab } from "./AdminTab";
import { HelpGuide } from "./HelpGuide";
import { HomeTab } from "./HomeTab";
import { Crest } from "./Mark";
import { SquadTab } from "./SquadTab";
import { VoteTab } from "./VoteTab";
import { WhoAreYou } from "./WhoAreYou";

const PLAYER_KEY = "bf_player_id";
const PIN_KEY = "bf_admin_pin";
const PLAYER_LEGACY = ["nk_player_id", "oli_fc_player_id"];
const PIN_LEGACY = ["nk_admin_pin", "oli_fc_admin_pin"];

function readLocal(key: string, legacy: string[]): string | null {
  const current = window.localStorage.getItem(key);
  if (current) return current;
  for (const oldKey of legacy) {
    const old = window.localStorage.getItem(oldKey);
    if (old) {
      window.localStorage.setItem(key, old);
      window.localStorage.removeItem(oldKey);
      return old;
    }
  }
  return null;
}

function writeLocal(key: string, value: string, legacy: string[]) {
  window.localStorage.setItem(key, value);
  for (const oldKey of legacy) window.localStorage.removeItem(oldKey);
}

function clearLocal(key: string, legacy: string[]) {
  window.localStorage.removeItem(key);
  for (const oldKey of legacy) window.localStorage.removeItem(oldKey);
}

type Tab = "home" | "vote" | "squad" | "admin";

export function App({ db }: { db: PublicDb }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("home");

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- localStorage identity after mount */
    setPlayerId(readLocal(PLAYER_KEY, PLAYER_LEGACY));
    setPin(readLocal(PIN_KEY, PIN_LEGACY));
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const players = activePlayers(db);
  const player = players.find((p) => p.id === playerId) ?? null;

  function pick(next: Player | string) {
    const id = typeof next === "string" ? next : next.id;
    writeLocal(PLAYER_KEY, id, PLAYER_LEGACY);
    setPlayerId(id);
    router.refresh();
  }

  function clearPlayer() {
    clearLocal(PLAYER_KEY, PLAYER_LEGACY);
    setPlayerId(null);
    setTab("home");
  }

  async function createAndPick(name: string) {
    const res = await addPlayer(name);
    if (res.error || !res.id) return res;
    pick(res.id);
    return res;
  }

  const club = db.settings.clubName;

  if (!ready) {
    return (
      <>
        <HelpGuide spots={db.settings.spots5s} />
        <div className="screen">
          <div className="brand">
            <Crest />
            <p className="club">{club}</p>
          </div>
          <p className="muted mt-4">Hang on</p>
        </div>
      </>
    );
  }

  if (!player) {
    return (
      <>
        <HelpGuide spots={db.settings.spots5s} />
        <WhoAreYou clubName={club} players={players} onPick={pick} onCreate={createAndPick} />
      </>
    );
  }

  return (
    <div className="app">
      <HelpGuide spots={db.settings.spots5s} />
      <header className="topbar">
        <div className="brand">
          <Crest />
          <div>
            <p className="club">{club}</p>
            <p className="who">
              {player.name}{" "}
              <button type="button" className="text-btn" onClick={clearPlayer}>
                Not you?
              </button>
            </p>
          </div>
        </div>
      </header>

      <main className="main">
        {tab === "home" && <HomeTab db={db} player={player} onVote={() => setTab("vote")} />}
        {tab === "vote" && <VoteTab db={db} player={player} />}
        {tab === "squad" && <SquadTab db={db} player={player} />}
        {tab === "admin" && (
          <AdminTab
            db={db}
            pin={pin}
            onUnlock={(nextPin) => {
              writeLocal(PIN_KEY, nextPin, PIN_LEGACY);
              setPin(nextPin);
            }}
            onLock={() => {
              clearLocal(PIN_KEY, PIN_LEGACY);
              setPin(null);
            }}
          />
        )}
      </main>

      <nav className="dock">
        <DockButton label="Home" active={tab === "home"} onClick={() => setTab("home")} />
        <DockButton label="Vote" active={tab === "vote"} onClick={() => setTab("vote")} />
        <DockButton label="Squad" active={tab === "squad"} onClick={() => setTab("squad")} />
        <DockButton label="Admin" active={tab === "admin"} onClick={() => setTab("admin")} />
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
    <button type="button" className={`dock-btn ${active ? "on" : ""}`} aria-current={active ? "page" : undefined} onClick={onClick}>
      {label}
    </button>
  );
}
