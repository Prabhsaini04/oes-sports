"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { PublicProfileDoc, UserDoc } from "@/lib/types";

export default function ProfilePage() {
  const { firebaseUser, profile, account, loading } = useAuth();

  if (loading) return <p className="px-6 py-16 text-center">Loading…</p>;
  if (!firebaseUser) {
    return (
      <p className="px-6 py-16 text-center">
        Sign in to view your profile.
      </p>
    );
  }
  if (!profile || !account) {
    return <p className="px-6 py-16 text-center">Loading…</p>;
  }

  // Remounted (via key) whenever the loaded profile identity changes, so
  // the form's initial values always match the latest fetch without
  // syncing external state through an effect.
  return (
    <ProfileForm
      key={firebaseUser.uid}
      uid={firebaseUser.uid}
      profile={profile}
      account={account}
    />
  );
}

function ProfileForm({
  uid,
  profile,
  account,
}: {
  uid: string;
  profile: PublicProfileDoc;
  account: UserDoc;
}) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [gamertag, setGamertag] = useState(profile.gamertag ?? "");
  const [saved, setSaved] = useState(false);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaved(false);
    // Rules restrict this update to exactly displayName/gamertag
    // (firestore.rules) — fallback rendering handles an empty displayName.
    await updateDoc(doc(db, "profiles", uid), {
      displayName: displayName.trim() || "Member",
      gamertag: gamertag.trim() || null,
    });
    setSaved(true);
  }

  return (
    <div className="mx-auto w-full max-w-sm px-6 py-16">
      <h1 className="mb-6 text-2xl font-semibold">Your profile</h1>
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Display name
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Gamertag (optional)
          <input
            value={gamertag}
            onChange={(e) => setGamertag(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <p className="text-xs text-zinc-500">
          Role: {account.roles.organizer ? "Organizer" : "Member"} (granted
          only by the Human Owner — no self-service role change)
        </p>
        {saved && <p className="text-sm text-green-600">Saved.</p>}
        <button
          type="submit"
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Save
        </button>
      </form>
    </div>
  );
}
