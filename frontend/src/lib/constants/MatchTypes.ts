export type MatchState =
  | { status: 'requesting' | 'waiting' | 'timeout' }
  | { status: 'matched'; matchingId: string };

export const TOTAL_MATCH_TIME = 10 * 60; // 10 minutes in seconds
