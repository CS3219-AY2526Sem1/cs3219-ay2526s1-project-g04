// src/services/SelectionService.ts
import * as Repo from '../repositories/QuestionRepository.js';
import * as Reservations from '../repositories/ReservationRepository.js';

type Difficulty = 'Easy' | 'Medium' | 'Hard';

const RES_TTL = 10 * 60; // seconds

function toDifficulty(input?: string): Difficulty | undefined {
  if (!input) return undefined;
  const s = input.trim().toLowerCase();
  if (s === 'easy') return 'Easy';
  if (s === 'medium') return 'Medium';
  if (s === 'hard') return 'Hard';
  return undefined;
}

export async function selectOne(body: {
  matching_id: string;
  difficulty?: string;
  topics?: string[];
  recent_ids?: string[];
}) {
  // If already allocated a question to session
  const existing = await Reservations.getReservation(body.matching_id);
  if (existing) return { question_id: existing };

  const args: Parameters<typeof Repo.pickRandomEligible>[0] = {};

  const normalized = toDifficulty(body.difficulty);
  if (normalized) args.difficulty = normalized;
  if (body.topics && body.topics.length) args.topics = body.topics;
  if (body.recent_ids && body.recent_ids.length)
    args.recentIds = body.recent_ids;

  const choice = await Repo.pickRandomEligible(args);

  if (!choice) return { question_id: null };

  await Reservations.upsertReservation(body.matching_id, choice.id, RES_TTL);
  return { question_id: choice.id };
}
