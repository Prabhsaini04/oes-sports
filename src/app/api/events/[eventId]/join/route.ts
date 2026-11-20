import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { AuthError, requireUser } from "@/lib/auth/session";
import type { EventDoc, PublicProfileDoc } from "@/lib/types";

// THREAT-SPT-001 "Tampering" row: capacity must be re-checked and the join
// written atomically in one Firestore transaction — a plain
// check-then-write from the client is explicitly rejected as unsafe.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { uid } = await requireUser(request);
    const { eventId } = await params;
    const db = adminDb();
    const eventRef = db.collection("events").doc(eventId);
    const participantRef = eventRef.collection("participants").doc(uid);

    const result = await db.runTransaction(async (tx) => {
      const [eventSnap, participantSnap, profileSnap] = await Promise.all([
        tx.get(eventRef),
        tx.get(participantRef),
        tx.get(db.collection("profiles").doc(uid)),
      ]);

      if (!eventSnap.exists) {
        return { error: "Event not found", status: 404 as const };
      }
      const event = eventSnap.data() as EventDoc;

      if (event.status !== "upcoming") {
        return { error: "Event is not open for joining", status: 409 as const };
      }
      if (participantSnap.exists) {
        return { error: "Already joined", status: 409 as const };
      }
      if (event.capacity !== null && event.participantCount >= event.capacity) {
        return { error: "Event is full", status: 409 as const };
      }

      const profile = profileSnap.data() as PublicProfileDoc | undefined;
      tx.set(participantRef, {
        uid,
        displayName: profile?.displayName ?? "Member",
        joinedAt: FieldValue.serverTimestamp(),
      });
      tx.update(eventRef, { participantCount: FieldValue.increment(1) });

      return { ok: true as const };
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
