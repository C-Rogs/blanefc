import type { AppDb, Poll, SquadMember } from "./types";

const now = "2026-08-27T09:00:00.000Z";

function player(id: string, name: string): AppDb["players"][number] {
  return { id, name, active: true, createdAt: now };
}

function member(
  playerId: string,
  status: SquadMember["status"],
  extra: Partial<SquadMember> = {},
): SquadMember {
  return {
    playerId,
    status,
    waitlistOrder: status === "waitlist" ? extra.waitlistOrder ?? 1 : null,
    paid: extra.paid ?? false,
    stillOwes: extra.stillOwes ?? false,
  };
}

export function seedDb(): AppDb {
  const sep1: Poll = {
    id: "poll-sep-1",
    title: "September session 1",
    status: "locked",
    createdAt: "2026-08-09T18:50:00.000Z",
    costPounds: 10,
    options: [
      { id: "sep1-tue", date: "2026-09-01", note: "" },
      { id: "sep1-wed", date: "2026-09-02", note: "" },
      { id: "sep1-thu", date: "2026-09-03", note: "" },
    ],
    votes: [],
    lockedOptionId: "sep1-tue",
    format: "5s",
    spots: 12,
    lockedAt: "2026-08-24T13:32:00.000Z",
    squad: [
      member("p-dom", "in"),
      member("p-joe", "in", { paid: true }),
      member("p-mike", "in"),
      member("p-new-aug21", "in"),
      member("p-dan", "in"),
      member("p-aman", "in"),
      member("p-greg", "in"),
      member("p-sammy-d", "in"),
      member("p-new-jul", "in"),
      member("p-reece-sub", "in", { paid: true }),
      member("p-cameron", "in"),
      member("p-charles", "waitlist", { waitlistOrder: 1 }),
      member("p-arnav", "waitlist", { waitlistOrder: 2 }),
      member("p-von", "waitlist", { waitlistOrder: 3 }),
      member("p-harry", "waitlist", { waitlistOrder: 4 }),
      member("p-aneesh", "dropped"),
    ],
  };

  const sep15: Poll = {
    id: "poll-sep-15",
    title: "September session 2",
    status: "locked",
    createdAt: "2026-08-18T12:00:00.000Z",
    costPounds: 10,
    options: [{ id: "sep15-tue", date: "2026-09-15", note: "5s" }],
    votes: [],
    lockedOptionId: "sep15-tue",
    format: "5s",
    spots: 12,
    lockedAt: "2026-08-24T13:32:00.000Z",
    squad: [
      member("p-oli", "in"),
      member("p-ehis", "in"),
      member("p-sammy", "in"),
      member("p-reece", "in"),
      member("p-joe", "in"),
      member("p-cameron", "in"),
      member("p-aman", "in"),
      member("p-dom", "in"),
      member("p-josh", "in"),
      member("p-paulius", "in"),
      member("p-harry", "in"),
    ],
  };

  const nextDates: Poll = {
    id: "poll-autumn-1",
    title: "Late September dates",
    status: "open",
    createdAt: now,
    costPounds: 10,
    options: [
      { id: "aut-tue", date: "2026-09-29", note: "5s and 7s" },
      { id: "aut-wed", date: "2026-09-30", note: "5s and 7s" },
      { id: "aut-thu", date: "2026-10-01", note: "5s only" },
    ],
    votes: [],
  };

  return {
    settings: {
      clubName: "BlaneFC",
      venueName: "PlayFootball Mile End",
      venueMapsUrl: "https://maps.app.goo.gl/HtJNtaiHbvi9BARm7",
      kickoff: "19:00",
      defaultCostPounds: 10,
      spots5s: 12,
      spots7s: 16,
      organiserPin: "0000",
      payeeName: "Organiser",
      sortCode: "",
      accountNumber: "",
    },
    players: [
      player("p-oli", "Organiser"),
      player("p-cameron", "Player 2"),
      player("p-aneesh", "Player 3"),
      player("p-joe", "Player 4"),
      player("p-aman", "Player 5"),
      player("p-sammy", "Player 6"),
      player("p-sammy-d", "Player 7"),
      player("p-dan", "Player 8"),
      player("p-greg", "Player 9"),
      player("p-dom", "Player 10"),
      player("p-mike", "Player 11"),
      player("p-sim", "Player 12"),
      player("p-charles", "Player 13"),
      player("p-arnav", "Player 14"),
      player("p-ehis", "Player 15"),
      player("p-harry", "Player 16"),
      player("p-von", "Player 17"),
      player("p-josh", "Player 18"),
      player("p-reece", "Player 19"),
      player("p-paulius", "Player 20"),
      player("p-new-aug21", "New player 1"),
      player("p-new-jul", "New player 2"),
      player("p-reece-sub", "New player 3"),
    ],
    polls: [sep1, sep15, nextDates],
  };
}
