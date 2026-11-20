import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { AuthError, requireOrganizer } from "@/lib/auth/session";
import type { PublicProfileDoc, ResultDoc, StandingEntry } from "@/lib/types";

const MAX_EDIT_HISTORY = 20;

function statsDelta(standings: StandingEntry[], sign: 1 | -1) {
  const delta = new Map<string, { wins: number; losses: number }>();
  for (const entry of standings) {
    const current = delta.get(entry.uid) ?? { wins: 0, losses: 0 };
    if (entry.result === "win") current.wins += sign;
    else current.losses += sign;
    delta.set(entry.uid, current);
  }
  return delta;
}

// REQ-005/REQ-007: Organizer-only result record/edit, with an audit log and
// a leaderboard recompute in the same operation — editing a result corrects
// the leaderboard by subtracting the old standings' deltas before applying
// the new ones (ENG-SPT-002-implementation-plan.md §2, "non-trivial piece
// of logic" flagged there). No Cloud Functions (ADR-SPT-002) — this API
// route is the entire mechanism.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { uid } = await requireOrganizer(request);
    const { eventId } = await params;
    const body = await request.json();

    const summary = typeof body.summary === "string" ? body.summary.trim() : "";
    const standings: StandingEntry[] = Array.isArray(body.standings)
      ? body.standings
      : [];

    if (!summary || standings.length === 0) {
      return NextResponse.json(
        { error: "summary and standings are required" },
        { status: 400 }
      );
    }
    for (const entry of standings) {
      if (
        typeof entry.uid !== "string" ||
        typeof entry.displayName !== "string" ||
        (entry.result !== "win" && entry.result !== "loss")
      ) {
        return NextResponse.json(
          { error: "Each standings entry needs uid, displayName, result" },
          { status: 400 }
        );
      }
    }

    const db = adminDb();
    const eventRef = db.collection("events").doc(eventId);
    const resultRef = eventRef.collection("meta").doc("result");

    await db.runTransaction(async (tx) => {
      const [eventSnap, resultSnap] = await Promise.all([
        tx.get(eventRef),
        tx.get(resultRef),
      ]);
      if (!eventSnap.exists) {
        throw new Error("Event not found");
      }

      const previous = resultSnap.exists ? (resultSnap.data() as ResultDoc) : null;

      const netDelta = new Map<string, { wins: number; losses: number }>();
      const apply = (map: Map<string, { wins: number; losses: number }>) => {
        for (const [uidKey, change] of map) {
          const current = netDelta.get(uidKey) ?? { wins: 0, losses: 0 };
          current.wins += change.wins;
          current.losses += change.losses;
          netDelta.set(uidKey, current);
        }
      };
      if (previous) apply(statsDelta(previous.standings, -1));
      apply(statsDelta(standings, 1));

      const profileRefs = [...netDelta.keys()].map((uidKey) =>
        db.collection("profiles").doc(uidKey)
      );
      const profileSnaps = await Promise.all(profileRefs.map((ref) => tx.get(ref)));

      profileSnaps.forEach((snap, index) => {
        if (!snap.exists) return;
        const change = netDelta.get(profileRefs[index].id)!;
        const current = (snap.data() as PublicProfileDoc).stats ?? {
          wins: 0,
          losses: 0,
        };
        tx.update(profileRefs[index], {
          stats: {
            wins: current.wins + change.wins,
            losses: current.losses + change.losses,
          },
        });
      });

      const editHistory = previous
        ? [
            ...previous.editHistory,
            {
              editedBy: uid,
              editedAt: Date.now(),
              previousSummary: previous.summary,
            },
          ].slice(-MAX_EDIT_HISTORY)
        : [];

      tx.set(resultRef, {
        summary,
        standings,
        recordedBy: previous?.recordedBy ?? uid,
        recordedAt: previous?.recordedAt ?? FieldValue.serverTimestamp(),
        editHistory,
      });
      tx.update(eventRef, {
        status: "completed",
        updatedBy: uid,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error && error.message === "Event not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
