import type { Poll, PublicDb } from "./types";
import { formatDay, formatKickoff, formatMoney } from "./format";
import {
  inSquad,
  lockedOption,
  playerName,
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
    lines.push("(Oli will drop bank details here)");
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
    `Reminder that this session is ${formatDay(option.date)} ${formatKickoff(db.settings.kickoff)} @ ${db.settings.venueName}`,
    "",
    `Please send ${formatMoney(poll.costPounds)} to the account below:`,
    "",
    bankBlock(db),
    "",
    due || "Everyone in has paid 🙌",
  ].join("\n");
}

export function pollMessage(db: PublicDb, poll: Poll): string {
  const lines = [
    `*${poll.title}*`,
    "Vote for every date you can actually play. First votes get the guaranteed spots.",
    "",
    ...poll.options.map(
      (o) => `• ${formatDay(o.date)}${o.note ? ` (${o.note})` : ""}`,
    ),
    "",
    "Tap the link, pick your name, vote. Takes 10 seconds.",
  ];
  return lines.join("\n");
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
    `${formatDay(option.date)} locked in. ${formatKickoff(db.settings.kickoff)} @ ${db.settings.venueName}.`,
    "",
    `In (${inSquad(poll).length}/${poll.spots}): ${inNames}`,
    wait.length
      ? `Waitlist: ${waitNames}`
      : "Waitlist is empty - shout if you want in.",
    "",
    `If you drop after this, you still pay ${formatMoney(poll.costPounds)} unless someone takes your spot.`,
  ].join("\n");
}

export function spotFreeMessage(db: PublicDb, poll: Poll): string {
  const option = lockedOption(poll);
  if (!option) return "";
  const next = waitlist(poll)[0];
  if (next) {
    return `Spot free for ${formatDay(option.date)}. @${playerName(db, next.playerId)} you're up if you still want it.`;
  }
  return `Anyone want to play ${formatDay(option.date)}? We have a space.`;
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
