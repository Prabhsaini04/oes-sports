import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

// Next.js only inlines NEXT_PUBLIC_* values into the browser bundle for
// statically-analyzable `process.env.THE_NAME` member access — a helper
// that does `process.env[name]` (computed/bracket access) can't be
// inlined, so in the browser it silently reads `undefined` from the
// empty `process.env` shim instead of the real value. Every read below is
// therefore a direct `process.env.X` expression; this function only
// validates the already-resolved value.
function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Firebase's client config is not a secret by design (REQUIREMENTS/ADR-SPT-001,
// THREAT-SPT-001 "Spoofing" note) — access control lives in Firestore Security
// Rules and the API routes, not in keeping this config hidden.
const firebaseConfig: FirebaseOptions = {
  apiKey: required(process.env.NEXT_PUBLIC_FIREBASE_API_KEY, "NEXT_PUBLIC_FIREBASE_API_KEY"),
  authDomain: required(
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
  ),
  projectId: required(
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
  ),
  storageBucket: required(
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
  ),
  messagingSenderId: required(
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
  ),
  appId: required(process.env.NEXT_PUBLIC_FIREBASE_APP_ID, "NEXT_PUBLIC_FIREBASE_APP_ID"),
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

// Local/CI-only: when running against the Firebase Local Emulator Suite
// (docker-compose, Jenkins pipeline) instead of a real Firebase project.
// Never set NEXT_PUBLIC_USE_FIREBASE_EMULATOR in staging/production.
const globalWithEmulatorFlag = globalThis as unknown as {
  __oesEmulatorConnected?: boolean;
};
if (
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true" &&
  !globalWithEmulatorFlag.__oesEmulatorConnected
) {
  const authHost = required(
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST,
    "NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST"
  );
  const [firestoreHost, firestorePort] = required(
    process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST,
    "NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST"
  ).split(":");
  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
  connectFirestoreEmulator(db, firestoreHost, Number(firestorePort));
  globalWithEmulatorFlag.__oesEmulatorConnected = true;
}
