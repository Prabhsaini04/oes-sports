import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { AuthError, requireUser } from "@/lib/auth/session";

// A member may only withdraw their own registration — the UID comes from
// the verified ID token, never a client-supplied member ID
// (THREAT-SPT-001, "member edits another member's registration" row).
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
      const participantSnap = await tx.get(participantRef);
      if (!participantSnap.exists) {
        return { error: "Not a participant", status: 409 as const };
      }
      tx.delete(participantRef);
      tx.update(eventRef, { participantCount: FieldValue.increment(-1) });
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
