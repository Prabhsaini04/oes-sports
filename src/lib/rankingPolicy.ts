/**
 * Single named unit for the leaderboard ranking policy (REQUIREMENTS.md
 * question 9a: win count, provisional; tie-break alphabetical, provisional).
 * Changing the formula later is a change to this file only, not a
 * migration — callers just apply these constants to their query.
 */
export const RANKING_POLICY = {
  primarySortField: "stats.wins" as const,
  primarySortDirection: "desc" as const,
  tieBreakField: "displayName" as const,
  tieBreakDirection: "asc" as const,
};
