import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { AuthError, requireOrganizer } from "@/lib/auth/session";
import type { EventDoc, EventStatus } from "@/lib/types";

// REQ-002: edit/cancel — any Organizer, server-side role check only (the UI
// control hiding this from Members is not the enforcement boundary).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { uid } = await requireOrganizer(request);
    const { eventId } = await params;
    const body = await request.json();

    const ref = adminDb().collection("events").doc(eventId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const updates: Partial<EventDoc> = {};
    if (typeof body.name === "string" && body.name.trim()) {
      updates.name = body.name.trim();
    }
    if (typeof body.description === "string") {
      updates.description = body.description.trim();
    }
    if (body.startsAt !== undefined && Number.isFinite(Number(body.startsAt))) {
      updates.startsAt = Number(body.startsAt);
    }
    if (body.capacity !== undefined) {
      updates.capacity = body.capacity === null ? null : Number(body.capacity);
    }
    if (body.status !== undefined) {
      const allowed: EventStatus[] = ["upcoming", "completed", "cancelled"];
      if (!allowed.includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updates.status = body.status;
    }

    await ref.update({
      ...updates,
      updatedBy: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { uid } = await requireOrganizer(request);
    const { eventId } = await params;
    const ref = adminDb().collection("events").doc(eventId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Cancel, not hard-delete — preserves audit history (REQUIREMENTS.md §5 NFR).
    await ref.update({
      status: "cancelled",
      updatedBy: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
