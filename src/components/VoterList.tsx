import { shortName } from "@/lib/format";
import { playerName } from "@/lib/logic";
import type { PublicDb, Vote } from "@/lib/types";

export function VoterList({ db, votes }: { db: PublicDb; votes: Vote[] }) {
  if (votes.length === 0) {
    return <p className="faces empty">Nobody yet</p>;
  }
  return (
    <p className="faces">
      {votes.map((v) => shortName(playerName(db, v.playerId))).join(" · ")}
    </p>
  );
}
