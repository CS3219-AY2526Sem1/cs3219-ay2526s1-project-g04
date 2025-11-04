export interface ApiResult<T> {
  success: boolean;
  data?: T;
  message?: string;
}

// POST /match/request
export interface MatchCriteria {
  difficulty: string;
  topics: string[];
}

export interface MatchRequestBody {
  userId: string;
  criteria: MatchCriteria;
}

export interface MatchResponseBody {
  message: string;
}

// GET match/status/{userId}
export type MatchStatus =
  | 'waiting'
  | 'matched'
  | 'matching'
  | 'timeout'
  | 'disconnected'
  | 'cancelled';

export interface StatusResponseBody {
  status: MatchStatus;
  remainingTime: number | null;
  matchingId?: string;
}

// DELETE /match/cancel/{userId}
export interface DeleteResponseBody {
  message: string;
}
