"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { RANKING_POLICY } from "@/lib/rankingPolicy";
import type { PublicProfileDoc } from "@/lib/types";

interface Row extends PublicProfileDoc {
  uid: string;
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "profiles"),
      orderBy(RANKING_POLICY.primarySortField, RANKING_POLICY.primarySortDirection),
      orderBy(RANKING_POLICY.tieBreakField, RANKING_POLICY.tieBreakDirection)
    );
    return onSnapshot(q, (snap) =>
      setRows(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as PublicProfileDoc) })))
    );
  }, []);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-semibold">Leaderboard</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Ranked by win count (provisional formula — REQUIREMENTS.md question 9a).
      </p>
      {rows === null && <p>Loading…</p>}
      <ol className="flex flex-col gap-2">
        {rows?.map((row, index) => (
          <li
            key={row.uid}
            className="flex items-center justify-between rounded border border-zinc-200 px-4 py-2 dark:border-zinc-800"
          >
            <span>
              {index + 1}. {row.displayName}
            </span>
            <span className="text-sm text-zinc-500">
              {row.stats.wins}W – {row.stats.losses}L
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
