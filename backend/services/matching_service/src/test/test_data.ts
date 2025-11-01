import type { Difficulty } from '../clients/redis/types.js';

export type UserInput = {
  userId: string;
  difficulty: Difficulty;
  topics: string[];
};

export const Users: UserInput[] = [
  { userId: '001', difficulty: 'Easy', topics: ['Array', 'Strings'] }, // no match -> match with 5
  { userId: '002', difficulty: 'Medium', topics: ['Array'] }, // no match -> clear
  { userId: '003', difficulty: 'Easy', topics: ['DP'] }, // no match -> potential macth with 5
  { userId: '004', difficulty: 'Hard', topics: ['Array'] }, // no match -> not eligible for match
  { userId: '005', difficulty: 'Easy', topics: ['Array', 'DP'] }, // match with 1
];
