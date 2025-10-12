export type MatchedValue = {
  userAId: string; // Created my matching service
  userBId: string; // Created my matching service
  question_topics: string; // Created my matching service
  question_difficulty: string; // Created my matching service
  session_id?: string; // Created my collab service
  session_state: string; // Created my collab service
};

export type MatchedHset = {
  key: 'matched:{id}';
  value: MatchedValue;
};
