import { formatDateRange, formatDay, isPhoneName, todayIso } from "./format";
import type {
  AppDb,
  Format,
  Player,
  Poll,
  PollOption,
  PublicDb,
  SquadMember,
  Vote,
} from "./types";

export function playerName(db: { players: Player[] }, id: string): string {
  return db.players.find((p) => p.id === id)?.name ?? "Unknown";
}

export function activePlayers(db: { players: Player[] }): Player[] {
  return db.players
    .filter((p) => p.active)
    .slice()
    .sort((a, b) => {
      const phoneA = isPhoneName(a.name) ? 1 : 0;
      const phoneB = isPhoneName(b.name) ? 1 : 0;
      if (phoneA !== phoneB) return phoneA - phoneB;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
}

export function votesForOption(poll: Poll, optionId: string): Vote[] {
  return poll.votes
    .filter((v) => v.optionId === optionId)
    .slice()
    .sort((a, b) => a.at.localeCompare(b.at) || a.playerId.localeCompare(b.playerId));
}

export function playerVotes(poll: Poll, playerId: string): string[] {
  return poll.votes.filter((v) => v.playerId === playerId).map((v) => v.optionId);
}

export function spotsFor(format: Format, db: PublicDb | AppDb): number {
  return format === "7s" ? db.settings.spots7s : db.settings.spots5s;
}

export function buildSquad(poll: Poll, optionId: string, spots: number): SquadMember[] {
  const ordered = votesForOption(poll, optionId);
  return ordered.map((vote, index) => ({
    playerId: vote.playerId,
    status: index < spots ? "in" : "waitlist",
    waitlistOrder: index < spots ? null : index - spots + 1,
    paid: false,
    stillOwes: false,
  }));
}

export function lockedOption(poll: Poll): PollOption | undefined {
  if (!poll.lockedOptionId) return undefined;
  return poll.options.find((o) => o.id === poll.lockedOptionId);
}

export function playingCount(poll: Poll): number {
  return poll.squad?.filter((m) => m.status === "in").length ?? 0;
}

export function openSpots(poll: Poll): number {
  if (!poll.spots) return 0;
  return Math.max(0, poll.spots - playingCount(poll));
}

export function memberFor(poll: Poll, playerId: string): SquadMember | undefined {
  return poll.squad?.find((m) => m.playerId === playerId);
}

export function waitlist(poll: Poll): SquadMember[] {
  return (poll.squad ?? [])
    .filter((m) => m.status === "waitlist")
    .slice()
    .sort((a, b) => (a.waitlistOrder ?? 0) - (b.waitlistOrder ?? 0));
}

export function inSquad(poll: Poll): SquadMember[] {
  return (poll.squad ?? []).filter((m) => m.status === "in");
}

export function unpaid(poll: Poll): SquadMember[] {
  return (poll.squad ?? []).filter(
    (m) => (m.status === "in" && !m.paid) || m.stillOwes,
  );
}

export function dropPlayer(poll: Poll, playerId: string): void {
  if (!poll.squad) return;
  const member = poll.squad.find((m) => m.playerId === playerId);
  if (!member || member.status === "dropped") return;

  if (member.status === "waitlist") {
    member.status = "dropped";
    member.waitlistOrder = null;
    reindexWaitlist(poll);
    return;
  }

  const next = waitlist(poll)[0];
  member.status = "dropped";
  member.waitlistOrder = null;
  if (next) {
    next.status = "in";
    next.waitlistOrder = null;
    next.paid = false;
    member.stillOwes = false;
    member.paid = false;
    reindexWaitlist(poll);
  } else {
    member.stillOwes = true;
  }
}

export function claimSpot(poll: Poll, playerId: string): string | null {
  if (!poll.squad || !poll.spots) return "This date isn't locked yet.";
  const existing = poll.squad.find((m) => m.playerId === playerId);
  if (existing?.status === "in") return "You're already in.";
  if (existing?.status === "waitlist") {
    if (openSpots(poll) <= 0) return "Still full - you're on the waitlist.";
    const first = waitlist(poll)[0];
    if (first && first.playerId !== playerId) {
      return "You're not first on the waitlist.";
    }
    existing.status = "in";
    existing.waitlistOrder = null;
    existing.paid = false;
    reindexWaitlist(poll);
    return null;
  }
  if (existing?.status === "dropped") {
    if (openSpots(poll) <= 0 || waitlist(poll).length > 0) {
      existing.status = "waitlist";
      existing.stillOwes = false;
      existing.paid = false;
      existing.waitlistOrder = waitlist(poll).length + 1;
      reindexWaitlist(poll);
      return null;
    }
    existing.status = "in";
    existing.stillOwes = false;
    existing.paid = false;
    existing.waitlistOrder = null;
    return null;
  }
  if (openSpots(poll) > 0 && waitlist(poll).length === 0) {
    poll.squad.push({
      playerId,
      status: "in",
      waitlistOrder: null,
      paid: false,
      stillOwes: false,
    });
    return null;
  }
  poll.squad.push({
    playerId,
    status: "waitlist",
    waitlistOrder: waitlist(poll).length + 1,
    paid: false,
    stillOwes: false,
  });
  reindexWaitlist(poll);
  return null;
}

function reindexWaitlist(poll: Poll): void {
  waitlist(poll).forEach((m, i) => {
    m.waitlistOrder = i + 1;
  });
}

export function nextGame(db: PublicDb | AppDb, now = new Date()): Poll | undefined {
  const today = todayIso(now);
  return db.polls
    .filter((p) => p.status === "locked" && lockedOption(p))
    .sort((a, b) => (lockedOption(a)?.date ?? "").localeCompare(lockedOption(b)?.date ?? ""))
    .find((p) => (lockedOption(p)?.date ?? "") >= today);
}

export function openPolls(db: PublicDb | AppDb): Poll[] {
  return db.polls
    .filter((p) => p.status === "open")
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function upcomingLocked(db: PublicDb | AppDb, now = new Date()): Poll[] {
  const today = todayIso(now);
  return db.polls
    .filter((p) => p.status === "locked" && (lockedOption(p)?.date ?? "") >= today)
    .sort((a, b) => (lockedOption(a)?.date ?? "").localeCompare(lockedOption(b)?.date ?? ""));
}

export function pastGames(db: PublicDb | AppDb, now = new Date()): Poll[] {
  const today = todayIso(now);
  return db.polls
    .filter((p) => {
      if (p.status === "open") return false;
      const date = lockedOption(p)?.date ?? "";
      return Boolean(date) && date < today;
    })
    .sort((a, b) => (lockedOption(b)?.date ?? "").localeCompare(lockedOption(a)?.date ?? ""));
}

export function pollLabel(poll: Poll): string {
  if (poll.status !== "open") {
    const locked = lockedOption(poll);
    if (locked) return formatDay(locked.date);
  }
  return formatDateRange(poll.options.map((o) => o.date)) || poll.title;
}

export function toPublicDb(db: AppDb): PublicDb {
  const { organiserPin, ...settings } = db.settings;
  void organiserPin;
  return { players: db.players, polls: db.polls, settings };
}
