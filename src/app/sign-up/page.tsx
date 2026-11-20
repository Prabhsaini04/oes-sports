"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function SignUpPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signUp(email, password, displayName);
      router.push("/events");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm px-6 py-16">
      <h1 className="mb-6 text-2xl font-semibold">Create an account</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Display name
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            required
            minLength={8}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {submitting ? "Creating…" : "Sign up"}
        </button>
      </form>
    </div>
  );
}
