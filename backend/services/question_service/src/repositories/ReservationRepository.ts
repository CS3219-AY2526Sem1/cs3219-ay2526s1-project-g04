// src/repositories/ReservationRepository.ts

import { prisma } from './prisma';

// retrieve the currently active reservation's question id for the session, only if it has not expired
export async function getReservation(sessionId: string) {
  const row = await prisma.session_reservations.findFirst({
    where: {
      session_id: sessionId,
      expires_at: { gt: new Date() },
    },
  });
  return row?.question_id;
}

// create or update a reservation for the session with a ttl in seconds
export async function upsertReservation(
  sessionId: string,
  questionId: string,
  ttlSeconds: number,
) {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  await prisma.session_reservations.upsert({
    where: { session_id: sessionId },
    create: {
      session_id: sessionId,
      question_id: questionId,
      expires_at: expiresAt,
    },
    update: {
      question_id: questionId,
      expires_at: expiresAt,
    },
  });
}
