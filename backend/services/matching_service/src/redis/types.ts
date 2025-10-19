export type UserStatus = 'waiting' | 'matched' | 'timeout';

export interface UserData {
  status: UserStatus;
  difficulty: string;
  topics: string[];
  lastSeen: number;
}
