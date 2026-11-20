"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { callApi } from "@/lib/apiClient";

export default function NewEventPage() {
  const { firebaseUser, account, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [capacity, setCapacity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <p className="px-6 py-16 text-center">Loading…</p>;
  if (!firebaseUser || !account?.roles.organizer) {
    // Server-side role check in the API route is the real enforcement
    // boundary — this is only a UI convenience (THREAT-SPT-001).
    return (
      <p className="px-6 py-16 text-center">
        Only Organizers can create events.
      </p>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!firebaseUser) return;
    setError(null);
    setSubmitting(true);
    try {
      const response = await callApi(firebaseUser, "/api/events", {
        method: "POST",
        body: {
          name,
          description,
          startsAt: new Date(startsAt).getTime(),
          capacity: capacity ? Number(capacity) : null,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to create event");
      router.push(`/events/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm px-6 py-16">
      <h1 className="mb-6 text-2xl font-semibold">New event</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Starts at
          <input
            required
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Capacity (optional)
          <input
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {submitting ? "Creating…" : "Create event"}
        </button>
      </form>
    </div>
  );
}
