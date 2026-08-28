import "server-only";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { seedDb } from "./seed";
import type { AppDb, Format, MemberStatus, Poll, PollStatus } from "./types";

type Sql = NeonQueryFunction<false, false>;

let schemaReady = false;

function getSql(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Add a Neon connection string.");
  }
  const clean = url.replace(/&?channel_binding=require/g, "").replace("?&", "?");
  return neon(clean);
}

function asJson(db: AppDb): string {
  return JSON.stringify(db);
}

async function migrate(sql: Sql): Promise<void> {
  if (schemaReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS app_state (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      version INTEGER NOT NULL DEFAULT 1
    )
  `;
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
  schemaReady = true;
}

async function persistState(sql: Sql, db: AppDb, version?: number): Promise<boolean> {
  const payload = asJson(db);
  if (version == null) {
    await sql`
      INSERT INTO app_state (id, data, version)
      VALUES ('default', ${payload}::jsonb, 1)
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, version = app_state.version + 1
    `;
    return true;
  }
  const rows = await sql`
    UPDATE app_state
    SET data = ${payload}::jsonb, version = version + 1
    WHERE id = 'default' AND version = ${version}
    RETURNING version
  `;
  return rows.length > 0;
}

function parseState(raw: unknown): AppDb | null {
  let data: unknown = raw;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== "object") return null;
  const parsed = data as Partial<AppDb>;
  if (!parsed.settings || !Array.isArray(parsed.players) || !Array.isArray(parsed.polls)) {
    return null;
  }
  return parsed as AppDb;
}

async function loadLegacy(sql: Sql): Promise<AppDb | null> {
  const settingsRows = await sql`
    SELECT * FROM settings WHERE id = 'default' LIMIT 1
  `;
  if (settingsRows.length === 0) return null;

  const settingsRow = settingsRows[0];
  const [playerRows, pollRows, optionRows, voteRows, squadRows] = await Promise.all([
    sql`SELECT * FROM players ORDER BY name`,
    sql`SELECT * FROM polls ORDER BY created_at DESC`,
    sql`SELECT * FROM poll_options`,
    sql`SELECT * FROM votes`,
    sql`SELECT * FROM squad_members`,
  ]);

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

async function loadState(
  sql: Sql,
): Promise<{ db: AppDb; version: number } | { db: null; version: 0 }> {
  const rows = await sql`SELECT data, version FROM app_state WHERE id = 'default' LIMIT 1`;
  if (rows.length > 0) {
    const parsed = parseState(rows[0].data);
    if (!parsed) {
      throw new Error("Club data could not be read. Refresh and try again.");
    }
    return { db: parsed, version: Number(rows[0].version) };
  }
  const legacy = await loadLegacy(sql);
  if (!legacy) return { db: null, version: 0 };
  await persistState(sql, legacy);
  return { db: legacy, version: 1 };
}

export async function readDb(): Promise<AppDb> {
  const sql = getSql();
  await migrate(sql);
  const loaded = await loadState(sql);
  if (loaded.db) return loaded.db;
  const seeded = seedDb();
  await persistState(sql, seeded);
  return seeded;
}

export async function updateDb<T>(mutator: (db: AppDb) => T): Promise<T> {
  const sql = getSql();
  await migrate(sql);
  for (let attempt = 0; attempt < 4; attempt++) {
    const loaded = await loadState(sql);
    const db = loaded.db ?? seedDb();
    const version = loaded.db ? loaded.version : 0;
    const result = mutator(db);
    const ok =
      version === 0
        ? await persistState(sql, db)
        : await persistState(sql, db, version);
    if (ok) return result;
  }
  throw new Error("Club data was updating. Tap again.");
}
