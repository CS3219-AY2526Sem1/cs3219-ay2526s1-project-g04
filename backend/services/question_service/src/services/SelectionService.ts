// src/services/SelectionService.ts

import * as Repo from '../repositories/QuestionRepository';
import * as Reservations from '../repositories/ReservationRepository';

const RES_TTL = 10 * 60;

export async function selectOne(body: {
  session_id: string;
  difficulty?: string;
  topics?: string[];
  recent_ids?: string[];
}) {
  // if already allocated a question to session
  const existing = await Reservations.getReservation(body.session_id);
  if (existing) return { question_id: existing };

  const choice = await Repo.pickRandomEligible({
    difficulty: body.difficulty,
    topics: body.topics,
    recentIds: body.recent_ids,
  });

  if (!choice) return { question_id: null };

  await Reservations.upsertReservation(body.session_id, choice.id, RES_TTL);
  return { question_id: choice.id };
}
