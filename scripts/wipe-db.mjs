import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

function databaseUrl() {
  const fromEnv = process.env.DATABASE_URL;
  if (fromEnv) return fromEnv;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.startsWith("DATABASE_URL=")) {
      continue;
    }
    let value = trimmed.slice("DATABASE_URL=".length).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  }
  throw new Error("DATABASE_URL is not set");
}

const url = databaseUrl().replace(/&?channel_binding=require/g, "").replace("?&", "?");
const sql = neon(url);

await sql`DELETE FROM squad_members`;
await sql`DELETE FROM votes`;
await sql`DELETE FROM poll_options`;
await sql`DELETE FROM polls`;
await sql`DELETE FROM players`;
await sql`DELETE FROM settings`;
try {
  await sql`DELETE FROM app_state`;
} catch {
  // table exists after first deploy of the json store
}

console.log("wiped. next request reseeds.");
