export interface RawSession {
  id: number;
  questionId: string;
  endedAt: string | null;
  solved: boolean;
  UserAId: number;
  UserBId: number;
}

interface SessionStatus {
  sessionId?: string;
  sessionState: 'active' | 'created' | 'inactive';
}
