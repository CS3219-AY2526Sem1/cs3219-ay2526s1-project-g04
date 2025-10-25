// src/repositories/ReservationRepository.ts

import { prisma } from './prisma.js';

// retrieve the currently active reservation's question id for the session, only if it has not expired
export async function getReservation(matchingId: string) {
  const row = await prisma.reservations.findFirst({
    where: {
      matching_id: matchingId,
      expires_at: { gt: new Date() },
    },
  });
  return row?.question_id;
}

// create or update a reservation for the session with a ttl in seconds
export async function upsertReservation(
  matchingId: string,
  questionId: string,
  ttlSeconds: number,
) {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  await prisma.reservations.upsert({
    where: { matching_id: matchingId },
    create: {
      matching_id: matchingId,
      question_id: questionId,
      expires_at: expiresAt,
    },
    update: {
      question_id: questionId,
      expires_at: expiresAt,
    },
  });
}
