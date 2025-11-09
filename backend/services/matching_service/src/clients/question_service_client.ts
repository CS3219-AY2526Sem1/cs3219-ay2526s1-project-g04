import { logger } from '../logger/logger.js';
import type { QuestionSelectResponse } from './redis/types.js';

const QUESTION_SERVICE_URL = process.env['QUESTION_SERVICE_URL']; // need to configure after deploying

export async function getQuestionId(
  matchingId: string,
  difficulty: string,
  topics: string[],
): Promise<string | null> {
  try {
    const url = `${QUESTION_SERVICE_URL}/select`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matching_id: matchingId,
        difficulty,
        topics,
      }),
    });

    if (res.status === 200) {
      const results = (await res.json()) as QuestionSelectResponse;
      logger.info(
        `[getQuestionId] Success! Data retrieved: ${JSON.stringify(results)}`,
      );

      return results.question_id;
    } else if (res.status === 409) {
      // no eligible question
      logger.warn(
        `[getQuestionId] No eligible question for matchingId=${matchingId}, difficulty=${difficulty}, topics=${topics}.`,
      );
      return null;
    } else {
      const errorText = await res.text();
      throw new Error(
        `[getQuestionId] Request failed (${res.status}): ${errorText}.`,
      );
    }
  } catch (error) {
    logger.error(
      `[getQuestionId] Error selecting question from question service.`,
      error,
    );
    return null;
  }
  // return 'test-id';
}
