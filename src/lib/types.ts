export type EventStatus = "upcoming" | "completed" | "cancelled";

// Private — readable only by the account owner (THREAT-SPT-001
// "Information disclosure" row: email must never be exposed by a public
// read, so it is split out of the publicly-readable profile doc below).
export interface UserDoc {
  email: string;
  roles: { organizer: boolean };
  createdAt: number;
}

// Public — readable by anyone (REQ-004, REQ-007); never contains email or
// the roles flag.
export interface PublicProfileDoc {
  displayName: string;
  gamertag: string | null;
  stats: { wins: number; losses: number };
}

export interface EventDoc {
  name: string;
  description: string;
  startsAt: number;
  capacity: number | null;
  status: EventStatus;
  participantCount: number;
  createdBy: string;
  createdAt: number;
  updatedBy: string;
  updatedAt: number;
}

export interface ParticipantDoc {
  uid: string;
  displayName: string;
  joinedAt: number;
}

export interface StandingEntry {
  uid: string;
  displayName: string;
  result: "win" | "loss";
}

export interface ResultEditLogEntry {
  editedBy: string;
  editedAt: number;
  previousSummary: string;
}

export interface ResultDoc {
  summary: string;
  standings: StandingEntry[];
  recordedBy: string;
  recordedAt: number;
  editHistory: ResultEditLogEntry[];
}
