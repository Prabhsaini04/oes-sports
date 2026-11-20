"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, onSnapshot, serverTimestamp, writeBatch } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import type { PublicProfileDoc, UserDoc } from "@/lib/types";

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  account: UserDoc | null;
  profile: PublicProfileDoc | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [account, setAccount] = useState<UserDoc | null>(null);
  const [profile, setProfile] = useState<PublicProfileDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        setAccount(null);
        setProfile(null);
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    const unsubAccount = onSnapshot(doc(db, "users", firebaseUser.uid), (snapshot) => {
      setAccount((snapshot.data() as UserDoc | undefined) ?? null);
      setLoading(false);
    });
    const unsubProfile = onSnapshot(doc(db, "profiles", firebaseUser.uid), (snapshot) => {
      setProfile((snapshot.data() as PublicProfileDoc | undefined) ?? null);
    });
    return () => {
      unsubAccount();
      unsubProfile();
    };
  }, [firebaseUser]);

  async function signUp(email: string, password: string, displayName: string) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    // roles is never client-writable beyond this one initial-creation write
    // for the account's own doc, enforced by firestore.rules (ENG-SPT-006)
    // — role always starts false here, never settable by the signing-up
    // member themselves. displayName/gamertag/stats live in the public
    // profile doc, split out so a public read never exposes email/roles
    // (THREAT-SPT-001).
    const batch = writeBatch(db);
    batch.set(doc(db, "users", credential.user.uid), {
      email,
      roles: { organizer: false },
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, "profiles", credential.user.uid), {
      displayName,
      gamertag: null,
      stats: { wins: 0, losses: 0 },
    });
    await batch.commit();
  }

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{ firebaseUser, account, profile, loading, signUp, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
