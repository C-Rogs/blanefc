import type { Poll, PublicDb } from "./types";
import { formatDay, formatKickoff, formatMoney } from "./format";
import {
  inSquad,
  lockedOption,
  playerName,
  pollLabel,
  unpaid,
  waitlist,
} from "./logic";

function mentions(db: PublicDb, playerIds: string[]): string {
  return playerIds.map((id) => `@${playerName(db, id)}`).join(" ");
}

function bankBlock(db: PublicDb): string {
  const { payeeName, sortCode, accountNumber } = db.settings;
  const lines = [payeeName];
  if (sortCode) lines.push(`Sort code: ${sortCode}`);
  if (accountNumber) lines.push(`Account number: ${accountNumber}`);
  if (!sortCode && !accountNumber) {
    lines.push("(Bank details go here)");
  }
  return lines.join("\n");
}

export function paymentMessage(db: PublicDb, poll: Poll): string {
  const option = lockedOption(poll);
  if (!option) return "";
  const due = mentions(
    db,
    unpaid(poll).map((m) => m.playerId),
  );
  return [
    `${formatDay(option.date)}, ${formatKickoff(db.settings.kickoff)} @ ${db.settings.venueName}`,
    "",
    `${formatMoney(poll.costPounds)} to:`,
    "",
    bankBlock(db),
    "",
    due || "All paid.",
  ].join("\n");
}

export function pollMessage(db: PublicDb, poll: Poll): string {
  return [
    `*${pollLabel(poll)}*`,
    "Tap every night you can actually play.",
    "",
    ...poll.options.map((o) => `• ${formatDay(o.date)}${o.note ? ` (${o.note})` : ""}`),
    "",
    `First ${db.settings.spots5s} on the winning date are in. Rest waitlist.`,
  ].join("\n");
}

export function lockedMessage(db: PublicDb, poll: Poll): string {
  const option = lockedOption(poll);
  if (!option) return "";
  const inNames = mentions(
    db,
    inSquad(poll).map((m) => m.playerId),
  );
  const wait = waitlist(poll);
  const waitNames = mentions(
    db,
    wait.map((m) => m.playerId),
  );
  return [
    `${formatDay(option.date)} locked. ${formatKickoff(db.settings.kickoff)} @ ${db.settings.venueName}.`,
    "",
    `In (${inSquad(poll).length}/${poll.spots}): ${inNames}`,
    wait.length ? `Waitlist: ${waitNames}` : "Waitlist empty. Shout if you want in.",
    "",
    `Drop after this and you still pay ${formatMoney(poll.costPounds)} unless someone takes the spot.`,
  ].join("\n");
}

export function spotFreeMessage(db: PublicDb, poll: Poll): string {
  const option = lockedOption(poll);
  if (!option) return "";
  const next = waitlist(poll)[0];
  if (next) {
    return `Spot free ${formatDay(option.date)}. @${playerName(db, next.playerId)} you're up if you still want it.`;
  }
  return `Anyone for ${formatDay(option.date)}? We've got a space.`;
}

export function matchDayMessage(db: PublicDb, poll: Poll): string {
  const option = lockedOption(poll);
  if (!option) return "";
  const pitch = poll.pitch ? `Pitch ${poll.pitch}.` : "Check reception for the pitch number.";
  return [
    `Today ${formatKickoff(db.settings.kickoff)} @ ${db.settings.venueName}. Aim for 6:45 so we use the full hour.`,
    pitch,
    db.settings.venueMapsUrl,
  ].join("\n");
}

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
