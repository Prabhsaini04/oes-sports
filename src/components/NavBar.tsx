"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export function NavBar() {
  const { firebaseUser, profile, account, signOut } = useAuth();

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-semibold tracking-tight">
          OES Sports
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/events">Events</Link>
          <Link href="/leaderboard">Leaderboard</Link>
          {account?.roles.organizer && <Link href="/events/new">New event</Link>}
          {firebaseUser ? (
            <>
              <Link href="/profile">{profile?.displayName ?? "Profile"}</Link>
              <button
                onClick={() => signOut()}
                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/sign-in">Sign in</Link>
              <Link href="/sign-up">Sign up</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
