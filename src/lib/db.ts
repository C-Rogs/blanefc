import "server-only";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { seedDb } from "./seed";
import type { AppDb, Format, MemberStatus, Poll, PollStatus } from "./types";

type Sql = NeonQueryFunction<false, false>;

function getSql(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Add a Neon connection string.");
  }
  const clean = url.replace(/&?channel_binding=require/g, "").replace("?&", "?");
  return neon(clean);
}

async function migrate(sql: Sql): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      club_name TEXT NOT NULL,
      venue_name TEXT NOT NULL,
      venue_maps_url TEXT NOT NULL DEFAULT '',
      kickoff TEXT NOT NULL,
      default_cost_pounds INTEGER NOT NULL,
      spots_5s INTEGER NOT NULL,
      spots_7s INTEGER NOT NULL,
      organiser_pin TEXT NOT NULL,
      payee_name TEXT NOT NULL,
      sort_code TEXT NOT NULL DEFAULT '',
      account_number TEXT NOT NULL DEFAULT ''
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      cost_pounds INTEGER NOT NULL,
      locked_option_id TEXT,
      format TEXT,
      spots INTEGER,
      pitch TEXT,
      locked_at TIMESTAMPTZ
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS poll_options (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT ''
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS votes (
      player_id TEXT NOT NULL REFERENCES players(id),
      option_id TEXT NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
      at TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (player_id, option_id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS squad_members (
      poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
      player_id TEXT NOT NULL REFERENCES players(id),
      status TEXT NOT NULL,
      waitlist_order INTEGER,
      paid BOOLEAN NOT NULL DEFAULT FALSE,
      still_owes BOOLEAN NOT NULL DEFAULT FALSE,
      PRIMARY KEY (poll_id, player_id)
    )
  `;
}

async function persistDb(sql: Sql, db: AppDb): Promise<void> {
  const queries = [
    sql`SELECT pg_advisory_xact_lock(874512)`,
    sql`DELETE FROM squad_members`,
    sql`DELETE FROM votes`,
    sql`DELETE FROM poll_options`,
    sql`DELETE FROM polls`,
    sql`DELETE FROM players`,
    sql`DELETE FROM settings`,
    sql`
      INSERT INTO settings (
        id, club_name, venue_name, venue_maps_url, kickoff,
        default_cost_pounds, spots_5s, spots_7s, organiser_pin,
        payee_name, sort_code, account_number
      ) VALUES (
        'default',
        ${db.settings.clubName},
        ${db.settings.venueName},
        ${db.settings.venueMapsUrl},
        ${db.settings.kickoff},
        ${db.settings.defaultCostPounds},
        ${db.settings.spots5s},
        ${db.settings.spots7s},
        ${db.settings.organiserPin},
        ${db.settings.payeeName},
        ${db.settings.sortCode},
        ${db.settings.accountNumber}
      )
    `,
    ...db.players.map(
      (p) => sql`
        INSERT INTO players (id, name, active, created_at)
        VALUES (${p.id}, ${p.name}, ${p.active}, ${p.createdAt})
      `,
    ),
    ...db.polls.flatMap((poll) => [
      sql`
        INSERT INTO polls (
          id, title, status, created_at, cost_pounds,
          locked_option_id, format, spots, pitch, locked_at
        ) VALUES (
          ${poll.id},
          ${poll.title},
          ${poll.status},
          ${poll.createdAt},
          ${poll.costPounds},
          ${poll.lockedOptionId ?? null},
          ${poll.format ?? null},
          ${poll.spots ?? null},
          ${poll.pitch ?? null},
          ${poll.lockedAt ?? null}
        )
      `,
      ...poll.options.map(
        (option) => sql`
          INSERT INTO poll_options (id, poll_id, date, note)
          VALUES (${option.id}, ${poll.id}, ${option.date}, ${option.note})
        `,
      ),
      ...poll.votes.map(
        (vote) => sql`
          INSERT INTO votes (player_id, option_id, at)
          VALUES (${vote.playerId}, ${vote.optionId}, ${vote.at})
        `,
      ),
      ...(poll.squad ?? []).map(
        (member) => sql`
          INSERT INTO squad_members (
            poll_id, player_id, status, waitlist_order, paid, still_owes
          ) VALUES (
            ${poll.id},
            ${member.playerId},
            ${member.status},
            ${member.waitlistOrder},
            ${member.paid},
            ${member.stillOwes}
          )
        `,
      ),
    ]),
  ];
  await sql.transaction(queries);
}

async function loadDb(sql: Sql): Promise<AppDb | null> {
  const settingsRows = await sql`
    SELECT * FROM settings WHERE id = 'default' LIMIT 1
  `;
  if (settingsRows.length === 0) return null;

  const settingsRow = settingsRows[0];
  const playerRows = await sql`SELECT * FROM players ORDER BY name`;
  const pollRows = await sql`SELECT * FROM polls ORDER BY created_at DESC`;
  const optionRows = await sql`SELECT * FROM poll_options`;
  const voteRows = await sql`SELECT * FROM votes`;
  const squadRows = await sql`SELECT * FROM squad_members`;

  const polls: Poll[] = pollRows.map((poll) => ({
    id: String(poll.id),
    title: String(poll.title),
    status: poll.status as PollStatus,
    createdAt: new Date(poll.created_at as string).toISOString(),
    costPounds: Number(poll.cost_pounds),
    lockedOptionId: poll.locked_option_id ? String(poll.locked_option_id) : undefined,
    format: poll.format ? (poll.format as Format) : undefined,
    spots: poll.spots == null ? undefined : Number(poll.spots),
    pitch: poll.pitch ? String(poll.pitch) : undefined,
    lockedAt: poll.locked_at
      ? new Date(poll.locked_at as string).toISOString()
      : undefined,
    options: optionRows
      .filter((row) => row.poll_id === poll.id)
      .map((row) => ({
        id: String(row.id),
        date: String(row.date),
        note: String(row.note ?? ""),
      })),
    votes: voteRows
      .filter((row) =>
        optionRows.some((option) => option.id === row.option_id && option.poll_id === poll.id),
      )
      .map((row) => ({
        playerId: String(row.player_id),
        optionId: String(row.option_id),
        at: new Date(row.at as string).toISOString(),
      })),
    squad: squadRows
      .filter((row) => row.poll_id === poll.id)
      .map((row) => ({
        playerId: String(row.player_id),
        status: row.status as MemberStatus,
        waitlistOrder: row.waitlist_order == null ? null : Number(row.waitlist_order),
        paid: Boolean(row.paid),
        stillOwes: Boolean(row.still_owes),
      })),
  }));

  return {
    settings: {
      clubName: String(settingsRow.club_name),
      venueName: String(settingsRow.venue_name),
      venueMapsUrl: String(settingsRow.venue_maps_url ?? ""),
      kickoff: String(settingsRow.kickoff),
      defaultCostPounds: Number(settingsRow.default_cost_pounds),
      spots5s: Number(settingsRow.spots_5s),
      spots7s: Number(settingsRow.spots_7s),
      organiserPin: String(settingsRow.organiser_pin),
      payeeName: String(settingsRow.payee_name),
      sortCode: String(settingsRow.sort_code ?? ""),
      accountNumber: String(settingsRow.account_number ?? ""),
    },
    players: playerRows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      active: Boolean(row.active),
      createdAt: new Date(row.created_at as string).toISOString(),
    })),
    polls,
  };
}

export async function readDb(): Promise<AppDb> {
  const sql = getSql();
  await migrate(sql);
  const existing = await loadDb(sql);
  if (existing) return existing;
  const seeded = seedDb();
  await persistDb(sql, seeded);
  return seeded;
}

export async function updateDb<T>(mutator: (db: AppDb) => T): Promise<T> {
  const sql = getSql();
  await migrate(sql);
  const db = (await loadDb(sql)) ?? seedDb();
  const result = mutator(db);
  await persistDb(sql, db);
  return result;
}
