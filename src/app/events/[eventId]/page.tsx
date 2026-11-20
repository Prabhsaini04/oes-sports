"use client";

import { use, useEffect, useState } from "react";
import { doc, onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/contexts/AuthContext";
import { callApi } from "@/lib/apiClient";
import type { EventDoc, ParticipantDoc, ResultDoc } from "@/lib/types";

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const { firebaseUser, account } = useAuth();
  const [event, setEvent] = useState<EventDoc | null>(null);
  const [participants, setParticipants] = useState<ParticipantDoc[]>([]);
  const [result, setResult] = useState<ResultDoc | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return onSnapshot(doc(db, "events", eventId), (snap) => {
      setEvent((snap.data() as EventDoc | undefined) ?? null);
    });
  }, [eventId]);

  useEffect(() => {
    // Members-only read per firestore.rules — the query simply returns
    // permission-denied for a signed-out Spectator, handled as "no rows".
    if (!firebaseUser) return undefined;
    const q = query(
      collection(db, "events", eventId, "participants"),
      orderBy("joinedAt", "asc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => setParticipants(snap.docs.map((d) => d.data() as ParticipantDoc)),
      () => setParticipants([])
    );
    return () => {
      unsubscribe();
      setParticipants([]);
    };
  }, [eventId, firebaseUser]);

  useEffect(() => {
    return onSnapshot(doc(db, "events", eventId, "meta", "result"), (snap) => {
      setResult((snap.data() as ResultDoc | undefined) ?? null);
    });
  }, [eventId]);

  if (!event) return <p className="px-6 py-16 text-center">Loading…</p>;

  const isParticipant = participants.some((p) => p.uid === firebaseUser?.uid);
  const isFull = event.capacity !== null && event.participantCount >= event.capacity;

  async function handleJoinLeave(action: "join" | "leave") {
    if (!firebaseUser) return;
    setActionError(null);
    setBusy(true);
    try {
      const response = await callApi(firebaseUser, `/api/events/${eventId}/${action}`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? `Failed to ${action}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Failed to ${action}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!firebaseUser) return;
    setBusy(true);
    try {
      await callApi(firebaseUser, `/api/events/${eventId}`, {
        method: "DELETE",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{event.name}</h1>
        <span className="text-xs uppercase text-zinc-500">{event.status}</span>
      </div>
      <p className="text-sm text-zinc-500">
        {new Date(event.startsAt).toLocaleString()}
      </p>
      <p className="mt-4">{event.description}</p>

      {event.status === "upcoming" && (
        <div className="mt-6 flex items-center gap-3">
          {firebaseUser ? (
            <button
              disabled={busy || (!isParticipant && isFull)}
              onClick={() => handleJoinLeave(isParticipant ? "leave" : "join")}
              className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {isParticipant ? "Leave" : isFull ? "Full" : "Join"}
            </button>
          ) : (
            <p className="text-sm text-zinc-500">Sign in to join.</p>
          )}
          <span className="text-sm text-zinc-500">
            {event.participantCount}
            {event.capacity !== null ? `/${event.capacity}` : ""} joined
          </span>
        </div>
      )}
      {actionError && <p className="mt-2 text-sm text-red-600">{actionError}</p>}

      {account?.roles.organizer && event.status !== "cancelled" && (
        <div className="mt-6 flex gap-3">
          <button
            disabled={busy}
            onClick={handleCancel}
            className="rounded border border-red-300 px-4 py-2 text-sm text-red-600 disabled:opacity-50"
          >
            Cancel event
          </button>
        </div>
      )}

      {firebaseUser && (
        <div className="mt-8">
          <h2 className="mb-2 font-medium">Participants</h2>
          <ul className="text-sm text-zinc-600 dark:text-zinc-400">
            {participants.map((p) => (
              <li key={p.uid}>{p.displayName}</li>
            ))}
            {participants.length === 0 && <li>No one has joined yet.</li>}
          </ul>
        </div>
      )}

      {result && (
        <div className="mt-8">
          <h2 className="mb-2 font-medium">Result</h2>
          <p className="text-sm">{result.summary}</p>
          <ul className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {result.standings.map((s) => (
              <li key={s.uid}>
                {s.displayName} — {s.result}
              </li>
            ))}
          </ul>
        </div>
      )}

      {account?.roles.organizer && (
        <RecordResultForm
          eventId={eventId}
          participants={participants}
          existing={result}
        />
      )}
    </div>
  );
}

function RecordResultForm({
  eventId,
  participants,
  existing,
}: {
  eventId: string;
  participants: ParticipantDoc[];
  existing: ResultDoc | null;
}) {
  const { firebaseUser } = useAuth();
  const [summary, setSummary] = useState(existing?.summary ?? "");
  const [outcomes, setOutcomes] = useState<Record<string, "win" | "loss">>(
    () =>
      Object.fromEntries(
        (existing?.standings ?? participants.map((p) => ({ uid: p.uid, result: "loss" as const }))).map(
          (s) => [s.uid, s.result]
        )
      )
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!firebaseUser) return;
    setError(null);
    setSubmitting(true);
    try {
      const standings = participants.map((p) => ({
        uid: p.uid,
        displayName: p.displayName,
        result: outcomes[p.uid] ?? "loss",
      }));
      const response = await callApi(firebaseUser, `/api/events/${eventId}/result`, {
        method: "POST",
        body: { summary, standings },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to record result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record result");
    } finally {
      setSubmitting(false);
    }
  }

  if (participants.length === 0) {
    return (
      <p className="mt-8 text-sm text-zinc-500">
        No participants to record a result for yet.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3">
      <h2 className="font-medium">{existing ? "Edit result" : "Record result"}</h2>
      <textarea
        required
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="Summary"
        className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      {participants.map((p) => (
        <label key={p.uid} className="flex items-center justify-between text-sm">
          {p.displayName}
          <select
            value={outcomes[p.uid] ?? "loss"}
            onChange={(e) =>
              setOutcomes((prev) => ({
                ...prev,
                [p.uid]: e.target.value as "win" | "loss",
              }))
            }
            className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="win">Win</option>
            <option value="loss">Loss</option>
          </select>
        </label>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {submitting ? "Saving…" : existing ? "Save edit" : "Record result"}
      </button>
    </form>
  );
}
