export type Format = "5s" | "7s";
export type RequestKind = "bug" | "feature";

export type Player = {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
};

export type Settings = {
  clubName: string;
  venueName: string;
  venueMapsUrl: string;
  kickoff: string;
  defaultCostPounds: number;
  spots5s: number;
  spots7s: number;
  organiserPin: string;
  payeeName: string;
  sortCode: string;
  accountNumber: string;
};

export type PublicSettings = Omit<Settings, "organiserPin">;

export type PollOption = {
  id: string;
  date: string;
  note: string;
};

export type Vote = {
  playerId: string;
  optionId: string;
  at: string;
};

export type MemberStatus = "in" | "waitlist" | "dropped";

export type SquadMember = {
  playerId: string;
  status: MemberStatus;
  waitlistOrder: number | null;
  paid: boolean;
  stillOwes: boolean;
};

export type PollStatus = "open" | "locked" | "played";

export type Poll = {
  id: string;
  title: string;
  status: PollStatus;
  createdAt: string;
  costPounds: number;
  options: PollOption[];
  votes: Vote[];
  lockedOptionId?: string;
  format?: Format;
  spots?: number;
  pitch?: string;
  lockedAt?: string;
  squad?: SquadMember[];
};

export type AppDb = {
  settings: Settings;
  players: Player[];
  polls: Poll[];
};

export type PublicDb = {
  settings: PublicSettings;
  players: Player[];
  polls: Poll[];
};
