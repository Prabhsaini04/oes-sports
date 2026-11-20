import "server-only";
import type { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { UserDoc } from "@/lib/types";

export class AuthError extends Error {
  constructor(
    public status: 401 | 403,
    message: string
  ) {
    super(message);
  }
}

/**
 * Every security-sensitive API route calls this first (ADR-SPT-002,
 * THREAT-SPT-001 trust boundary 6) — the Admin SDK bypasses Firestore
 * Security Rules, so authorization is enforced here, not assumed from the
 * client.
 */
export async function requireUser(request: NextRequest): Promise<{ uid: string }> {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer (.+)$/);
  if (!match) {
    throw new AuthError(401, "Missing or malformed Authorization header");
  }

  try {
    const decoded = await adminAuth().verifyIdToken(match[1]);
    return { uid: decoded.uid };
  } catch {
    throw new AuthError(401, "Invalid or expired ID token");
  }
}

/** Role check is server-side (never trust a client-supplied role). */
export async function requireOrganizer(request: NextRequest): Promise<{ uid: string }> {
  const { uid } = await requireUser(request);
  const snapshot = await adminDb().collection("users").doc(uid).get();
  const user = snapshot.data() as UserDoc | undefined;
  if (!user?.roles?.organizer) {
    throw new AuthError(403, "Organizer role required");
  }
  return { uid };
}
