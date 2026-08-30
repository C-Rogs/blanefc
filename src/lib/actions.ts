"use server";

import { revalidatePath } from "next/cache";
import { readDb, updateDb } from "./db";
import { formatDateRange, formatDay } from "./format";
import { createClubIssue } from "./linear";
import { buildSquad, claimSpot, dropPlayer, openSpots, spotsFor } from "./logic";
import type { Format, RequestKind } from "./types";

function slugName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
}

async function requireOrganiser(pin: string): Promise<string | undefined> {
  const db = await readDb();
  if (pin.trim() !== db.settings.organiserPin) return "Wrong PIN.";
  return undefined;
}

export async function addPlayer(
  name: string,
): Promise<{ id?: string; error?: string }> {
  const trimmed = name.trim();
  if (trimmed.length < 2) return { error: "Type a name." };
  const id = await updateDb((db) => {
    const exists = db.players.find(
      (p) => p.active && p.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) return exists.id;
    const nextId = `p-${slugName(trimmed) || "player"}-${crypto.randomUUID().slice(0, 6)}`;
    db.players.push({
      id: nextId,
      name: trimmed,
      active: true,
      createdAt: new Date().toISOString(),
    });
    return nextId;
  });
  revalidatePath("/");
  return { id };
}

export async function unlockOrganiser(pin: string): Promise<{ error?: string }> {
  const error = await requireOrganiser(pin);
  return error ? { error } : {};
}

export async function renameMe(
  playerId: string,
  name: string,
): Promise<{ error?: string }> {
  const trimmed = name.trim();
  if (trimmed.length < 2) return { error: "Type a name." };
  if (!playerId) return { error: "Pick a name first." };
  const error = await updateDb((db) => {
    const player = db.players.find((p) => p.id === playerId);
    if (!player) return "Couldn't find you.";
    const taken = db.players.find(
      (p) =>
        p.active &&
        p.id !== playerId &&
        p.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (taken) return "Someone's already using that name.";
    player.name = trimmed;
    return undefined;
  });
  revalidatePath("/");
  return error ? { error } : {};
}

export async function setVotes(
  playerId: string,
  pollId: string,
  optionIds: string[],
): Promise<{ error?: string }> {
  if (!playerId) return { error: "Pick a name first." };
  const error = await updateDb((db) => {
    const poll = db.polls.find((p) => p.id === pollId);
    if (!poll || poll.status !== "open") return "Voting is closed for this one.";
    const now = new Date().toISOString();
    const keep = new Set(optionIds);
    poll.votes = poll.votes.filter(
      (v) => !(v.playerId === playerId && !keep.has(v.optionId)),
    );
    for (const optionId of optionIds) {
      if (!poll.options.some((o) => o.id === optionId)) continue;
      const existing = poll.votes.find(
        (v) => v.playerId === playerId && v.optionId === optionId,
      );
      if (!existing) {
        poll.votes.push({ playerId, optionId, at: now });
      }
    }
    return undefined;
  });
  revalidatePath("/");
  return error ? { error } : {};
}

export async function dropOut(
  playerId: string,
  pollId: string,
): Promise<{ error?: string }> {
  if (!playerId) return { error: "Pick a name first." };
  const error = await updateDb((db) => {
    const poll = db.polls.find((p) => p.id === pollId);
    if (!poll || poll.status !== "locked") return "No locked game to drop from.";
    const member = poll.squad?.find((m) => m.playerId === playerId);
    if (!member || member.status === "dropped") return "You're not in this one.";
    dropPlayer(poll, playerId);
    return undefined;
  });
  revalidatePath("/");
  return error ? { error } : {};
}

export async function takeSpot(
  playerId: string,
  pollId: string,
): Promise<{ error?: string }> {
  if (!playerId) return { error: "Pick a name first." };
  const error = await updateDb((db) => {
    const poll = db.polls.find((p) => p.id === pollId);
    if (!poll || poll.status !== "locked") return "That date isn't booked yet.";
    return claimSpot(poll, playerId) ?? undefined;
  });
  revalidatePath("/");
  return error ? { error } : {};
}

export async function markPaid(
  pin: string,
  pollId: string,
  playerId: string,
  paid: boolean,
): Promise<{ error?: string }> {
  const denied = await requireOrganiser(pin);
  if (denied) return { error: denied };
  await updateDb((db) => {
    const poll = db.polls.find((p) => p.id === pollId);
    const member = poll?.squad?.find((m) => m.playerId === playerId);
    if (!member) return;
    member.paid = paid;
    if (paid) member.stillOwes = false;
  });
  revalidatePath("/");
  return {};
}

export async function ivePaid(
  playerId: string,
  pollId: string,
): Promise<{ error?: string }> {
  if (!playerId) return { error: "Pick a name first." };
  const error = await updateDb((db) => {
    const member = db.polls
      .find((p) => p.id === pollId)
      ?.squad?.find((m) => m.playerId === playerId);
    if (!member || member.status !== "in") return "You're not in this squad.";
    member.paid = true;
    member.stillOwes = false;
    return undefined;
  });
  revalidatePath("/");
  return error ? { error } : {};
}

export async function createPoll(
  pin: string,
  input: { title?: string; dates: { date: string; note: string }[] },
): Promise<{ error?: string }> {
  const denied = await requireOrganiser(pin);
  if (denied) return { error: denied };
  const dates = input.dates.filter((d) => d.date);
  if (dates.length === 0) return { error: "Add at least one date." };
  const title = input.title?.trim() || formatDateRange(dates.map((d) => d.date));
  await updateDb((db) => {
    db.polls.unshift({
      id: `poll-${crypto.randomUUID().slice(0, 8)}`,
      title,
      status: "open",
      createdAt: new Date().toISOString(),
      costPounds: db.settings.defaultCostPounds,
      options: dates.map((d) => ({
        id: `opt-${crypto.randomUUID().slice(0, 8)}`,
        date: d.date,
        note: d.note.trim(),
      })),
      votes: [],
    });
  });
  revalidatePath("/");
  return {};
}

export async function lockDate(
  pin: string,
  pollId: string,
  optionId: string,
  format: Format,
): Promise<{ error?: string }> {
  const denied = await requireOrganiser(pin);
  if (denied) return { error: denied };
  const error = await updateDb((db) => {
    const poll = db.polls.find((p) => p.id === pollId);
    if (!poll || poll.status !== "open") return "Poll isn't open.";
    if (!poll.options.some((o) => o.id === optionId)) return "Pick a date.";
    const spots = spotsFor(format, db);
    poll.status = "locked";
    poll.lockedOptionId = optionId;
    poll.title = formatDay(poll.options.find((o) => o.id === optionId)?.date ?? poll.title);
    poll.format = format;
    poll.spots = spots;
    poll.lockedAt = new Date().toISOString();
    poll.squad = buildSquad(poll, optionId, spots);
    return undefined;
  });
  revalidatePath("/");
  return error ? { error } : {};
}

export async function setPitch(
  pin: string,
  pollId: string,
  pitch: string,
): Promise<{ error?: string }> {
  const denied = await requireOrganiser(pin);
  if (denied) return { error: denied };
  await updateDb((db) => {
    const poll = db.polls.find((p) => p.id === pollId);
    if (poll) poll.pitch = pitch.trim();
  });
  revalidatePath("/");
  return {};
}

export async function updateSettings(
  pin: string,
  input: {
    clubName: string;
    payeeName: string;
    sortCode: string;
    accountNumber: string;
    venueName: string;
    venueMapsUrl: string;
    kickoff: string;
    defaultCostPounds: number;
    pin?: string;
  },
): Promise<{ error?: string }> {
  const denied = await requireOrganiser(pin);
  if (denied) return { error: denied };
  await updateDb((db) => {
    db.settings.clubName = input.clubName.trim() || db.settings.clubName;
    db.settings.payeeName = input.payeeName.trim() || db.settings.payeeName;
    db.settings.sortCode = input.sortCode.trim();
    db.settings.accountNumber = input.accountNumber.trim();
    db.settings.venueName = input.venueName.trim() || db.settings.venueName;
    db.settings.venueMapsUrl = input.venueMapsUrl.trim();
    db.settings.kickoff = input.kickoff.trim() || db.settings.kickoff;
    db.settings.defaultCostPounds = Number(input.defaultCostPounds) || 10;
    if (input.pin && input.pin.trim().length >= 4) {
      db.settings.organiserPin = input.pin.trim();
    }
  });
  revalidatePath("/");
  return {};
}

export async function deactivatePlayer(
  pin: string,
  playerId: string,
): Promise<{ error?: string }> {
  const denied = await requireOrganiser(pin);
  if (denied) return { error: denied };
  await updateDb((db) => {
    const player = db.players.find((p) => p.id === playerId);
    if (player && playerId !== "p-oli") player.active = false;
  });
  revalidatePath("/");
  return {};
}

export async function addGuest(
  pin: string,
  pollId: string,
  name: string,
): Promise<{ error?: string }> {
  const denied = await requireOrganiser(pin);
  if (denied) return { error: denied };
  const trimmed = name.trim();
  if (trimmed.length < 2) return { error: "Guest needs a name." };
  const error = await updateDb((db) => {
    const poll = db.polls.find((p) => p.id === pollId);
    if (!poll || poll.status !== "locked") return "Lock a date first.";
    const id = `p-${slugName(trimmed)}-${crypto.randomUUID().slice(0, 6)}`;
    db.players.push({
      id,
      name: trimmed,
      active: true,
      createdAt: new Date().toISOString(),
    });
    if (!poll.squad) poll.squad = [];
    if (openSpots(poll) > 0) {
      poll.squad.push({
        playerId: id,
        status: "in",
        waitlistOrder: null,
        paid: false,
        stillOwes: false,
      });
      return undefined;
    }
    return claimSpot(poll, id) ?? undefined;
  });
  revalidatePath("/");
  return error ? { error } : {};
}

export async function adminDrop(
  pin: string,
  pollId: string,
  playerId: string,
): Promise<{ error?: string }> {
  const denied = await requireOrganiser(pin);
  if (denied) return { error: denied };
  await updateDb((db) => {
    const poll = db.polls.find((p) => p.id === pollId);
    if (poll) dropPlayer(poll, playerId);
  });
  revalidatePath("/");
  return {};
}

export async function submitClubRequest(input: {
  kind: RequestKind;
  title: string;
  details: string;
  fromName: string;
}): Promise<{ error?: string }> {
  const kind = input.kind === "feature" ? "feature" : "bug";
  const title = input.title.trim().slice(0, 80);
  const details = input.details.trim().slice(0, 1500);
  const fromName = input.fromName.trim().slice(0, 80);
  if (title.length < 3) return { error: "Give it a short title." };
  if (details.length < 8) return { error: "Say what you want in a sentence or two." };
  if (fromName.length < 2) return { error: "Put your name on it." };
  const res = await createClubIssue({ kind, title, details, fromName });
  return res.error ? { error: res.error } : {};
}
