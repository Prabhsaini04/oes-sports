import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 px-6 text-center dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        OES Sports
      </h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Events, ladders, and leaderboards for the community.
      </p>
      <div className="flex gap-4">
        <Link
          href="/events"
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Browse events
        </Link>
        <Link
          href="/leaderboard"
          className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          Leaderboard
        </Link>
      </div>
    </div>
  );
}
