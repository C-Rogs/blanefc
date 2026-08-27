import { App } from "@/components/App";
import { readDb } from "@/lib/db";
import { toPublicDb } from "@/lib/logic";

export const dynamic = "force-dynamic";

export default async function Page() {
  const db = await readDb();
  return <App db={toPublicDb(db)} />;
}
