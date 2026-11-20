import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { AuthError, requireOrganizer } from "@/lib/auth/session";
import type { EventDoc } from "@/lib/types";

// REQ-002: any Organizer can create an event (role-based, not per-event
// ownership — ARCHITECTURE.md "Decided").
export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireOrganizer(request);
    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const startsAt = Number(body.startsAt);
    const capacity =
      body.capacity === null || body.capacity === undefined
        ? null
        : Number(body.capacity);

    if (!name || !Number.isFinite(startsAt)) {
      return NextResponse.json(
        { error: "name and startsAt are required" },
        { status: 400 }
      );
    }
    if (capacity !== null && (!Number.isFinite(capacity) || capacity <= 0)) {
      return NextResponse.json(
        { error: "capacity must be a positive number or null" },
        { status: 400 }
      );
    }

    const now = Date.now();
    const event: EventDoc = {
      name,
      description,
      startsAt,
      capacity,
      status: "upcoming",
      participantCount: 0,
      createdBy: uid,
      createdAt: now,
      updatedBy: uid,
      updatedAt: now,
    };

    const ref = await adminDb()
      .collection("events")
      .add({ ...event, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });

    return NextResponse.json({ id: ref.id }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
