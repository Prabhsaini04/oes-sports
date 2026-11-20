import "server-only";
import { cert, getApps, getApp, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Server-only (ADR-SPT-002): Next.js API routes use the Admin SDK for every
// authorization-sensitive write (join/leave capacity, event CRUD, results,
// leaderboard aggregation). The Admin SDK bypasses Firestore Security Rules
// entirely, so each API route must independently verify the caller's
// Firebase ID token and role (THREAT-SPT-001, trust boundary 6).
//
// FIREBASE_SERVICE_ACCOUNT_KEY holds the service-account JSON as a single
// env var value (never committed — see .env.example and
// 05-Security/SECRETS_MANAGEMENT.md). It is read lazily so a missing
// variable fails loudly only when server code actually needs Firebase, not
// at build time or in client bundles.
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getAdminApp(): App {
  if (getApps().length) {
    return getApp();
  }

  const serviceAccountJson = requireEnv("FIREBASE_SERVICE_ACCOUNT_KEY");
  const serviceAccount = JSON.parse(serviceAccountJson);

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

export function adminAuth() {
  return getAuth(getAdminApp());
}

export function adminDb() {
  return getFirestore(getAdminApp());
}
