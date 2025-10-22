// src/services/SelectionService.ts
import * as Repo from '../repositories/QuestionRepository.js';
import * as Reservations from '../repositories/ReservationRepository.js';

const RES_TTL = 10 * 60; // seconds

export async function selectOne(body: {
  matching_id: string;
  difficulty?: string;
  topics?: string[];
  recent_ids?: string[];
}) {
  // If already allocated a question to session
  const existing = await Reservations.getReservation(body.matching_id);
  if (existing) return { question_id: existing };

  // Omit undefined keys to satisfy exactOptionalPropertyTypes
  const args = {
    ...(body.difficulty !== undefined ? { difficulty: body.difficulty } : {}),
    ...(body.topics !== undefined ? { topics: body.topics } : {}),
    ...(body.recent_ids !== undefined ? { recentIds: body.recent_ids } : {}),
  } as const;

  const choice = await Repo.pickRandomEligible(args);

  if (!choice) return { question_id: null };

  await Reservations.upsertReservation(body.matching_id, choice.id, RES_TTL);
  return { question_id: choice.id };
}
