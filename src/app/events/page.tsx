"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { EventDoc } from "@/lib/types";

interface EventRow extends EventDoc {
  id: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventRow[] | null>(null);

  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("startsAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      setEvents(
        snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as EventDoc) }))
      );
    });
  }, []);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="mb-6 text-2xl font-semibold">Events</h1>
      {events === null && <p>Loading…</p>}
      {events?.length === 0 && (
        <p className="text-zinc-500">No events yet — check back soon.</p>
      )}
      <ul className="flex flex-col gap-3">
        {events?.map((event) => (
          <li key={event.id}>
            <Link
              href={`/events/${event.id}`}
              className="block rounded border border-zinc-200 p-4 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{event.name}</span>
                <span className="text-xs uppercase text-zinc-500">
                  {event.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-500">
                {new Date(event.startsAt).toLocaleString()} ·{" "}
                {event.participantCount}
                {event.capacity !== null ? `/${event.capacity}` : ""} joined
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
