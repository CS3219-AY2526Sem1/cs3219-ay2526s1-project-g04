export type UserStatus =
  | 'waiting'
  | 'matched'
  | 'matching'
  | 'timeout'
  | 'disconnected'
  | 'cancelled';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

/**
 * Format of data stored in status hash.
 */
export interface HashData {
  sessionKey: number; // joined timestamp
  status: UserStatus;
  difficulty: Difficulty;
  topics: string[];
  lastSeen: number;
  matchingId?: string;
}

/**
 * Format of job enqueued to entry queue.
 */
export type EntryQueueData =
  | {
      jobType: 'match_user';
      userId: string;
      sessionKey: number;
      userData?: HashData; // optional
    }
  | {
      jobType: 'clear_user';
      userId: string;
      sessionKey: number;
      userData: HashData; // required
    };

/**
 * Format of data stored in matching pool and fcfs list.
 */
export interface MatchingPoolData {
  userId: string;
  sessionKey: number;
}

export type QuestionSelectResponse = {
  question_id: string;
};
