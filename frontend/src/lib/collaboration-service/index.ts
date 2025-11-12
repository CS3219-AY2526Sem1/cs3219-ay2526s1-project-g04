export interface RawSession {
  id: number;
  questionId: string;
  endedAt: string | null;
  solved: boolean;
  UserAId: number;
  UserBId: number;
}

export interface ActiveSession {
  sessionId: number;
  questionId: string;
  partnerId: number;
}

export interface GetActiveSessionResponse {
  activeSession: ActiveSession | null;
}

interface SessionStatus {
  sessionId?: string;
  sessionState: 'active' | 'created' | 'inactive';
}
