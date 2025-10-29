import { MatchingServiceRedis } from '../clients/redis/redis_client.js';
import { MatchingMessenger } from '../clients/messenger/messenger_client.js';
import {
  EntryQueueData,
  MatchingPoolData,
  HashData,
} from '../clients/redis/types.js';
import { logger } from '../logger/logger.js';
import { getQuestionId } from '../clients/question_service_client.js';

/**
 * Threshold to detect for disconnected users. (in ms)
 */
const DISCONNECT_THRESHOLD = 30 * 1000;

/**
 * Minimum TTL needed for MatchingWorker to handle users.(in secs)
 */
const MIN_TTL_TO_HANDLE = 10;

/**
 * MatchingWorker
 *
 * This class is responsible for matching users via a 'match_user' job,
 * or clearing out users from the matching pool and fcfs list via a 'clear_user' job.
 */
export class MatchingWorker {
  private static instance: MatchingWorker;
  private matchingRedis: MatchingServiceRedis;
  private matchingMessenger: MatchingMessenger;

  private constructor(
    matchingRedis: MatchingServiceRedis,
    matchingMessenger: MatchingMessenger,
  ) {
    this.matchingRedis = matchingRedis;
    this.matchingMessenger = matchingMessenger;
  }

  public static async getInstance(): Promise<MatchingWorker> {
    if (!MatchingWorker.instance) {
      const matchingRedis = await MatchingServiceRedis.getInstance();
      const matchingMessenger = await MatchingMessenger.getInstance();
      MatchingWorker.instance = new MatchingWorker(
        matchingRedis,
        matchingMessenger,
      );
    }
    return MatchingWorker.instance;
  }

  /**
   * Main start function for the matching worker.
   * Reads from the entry queue.
   */
  public async start(): Promise<void> {
    logger.info('[start] Matching Worker started.');

    while (true) {
      try {
        const job: EntryQueueData | null =
          await this.matchingRedis.entryQueue.dequeue();
        if (!job) {
          await new Promise((res) => setTimeout(res, 1000));
          continue;
        }

        logger.info(
          `[start] Dequeued job ${job.jobType} with user ${job.userId}`,
        );
        if (job.jobType === 'clear_user') {
          await this.handleClearJob(job);
        } else if (job.jobType === 'match_user') {
          await this.handleMatchJob(job);
        }
      } catch (err) {
        logger.error(`[start] Error in matching worker loop: ${err}`);
        await new Promise((res) => setTimeout(res, 1000));
      }
    }
  }

  /**
   * Handles a 'clear_user' job and clears the given user within the job from the matching pool and
   * fcfs list.
   *
   * @param job Job containing the userId and data of user to clear.
   */
  public async handleClearJob(job: EntryQueueData): Promise<void> {
    if (job.jobType !== 'clear_user') {
      logger.error(`[handleClearJob] Function called for wrong job type.`);
      return;
    }
    const userData: HashData = job.userData;

    try {
      const data: MatchingPoolData = {
        userId: job.userId,
        sessionKey: job.sessionKey,
      };
      const difficulty = userData.difficulty;
      const topics = userData.topics;

      await Promise.all([
        this.matchingRedis.fcfsList.removeUser(data),
        this.matchingRedis.matchingPool.removeUser(data, difficulty, topics),
      ]);
      logger.info(
        `[handleClearJob] Clear job completed for job ${JSON.stringify(job)}.`,
      );
    } catch (error) {
      logger.error(`[handleClearJob] Clear job failed.`, job, error);
    }
  }

  /**
   * Handles a 'match_user' job by:
   * * Checking if the user is eligible for matching.
   * * Finding potential matches.
   * * Selecting another user out of all potential matches to match with.
   * * Finalising the match.
   *
   * @param job Job containing the userId, sessionKey of the user to match.
   */
  public async handleMatchJob(job: EntryQueueData): Promise<void> {
    if (job.jobType !== 'match_user') {
      logger.error(
        `[handleMatchJob] Job ${JSON.stringify(job)} assigned to wrong function`,
      );
      return;
    }

    try {
      const userData = await this.matchingRedis.statusHash.getUserData(
        job.userId,
      );
      if (!userData) {
        logger.warn(
          `[handleMatchJob] User ${job.userId} not found in statusHash. Skipped.`,
        );
        return;
      }

      // check if worker should handle the user
      if (!(await this.canMatchUser(job, userData))) {
        logger.info(
          `[handleMatchJob] Skipping job ${JSON.stringify(job)}, cannot handle.`,
        );
        return;
      }

      // get all potential matches
      logger.info(
        `[handleMatchJob] Getting potential matches for user ${job.userId}`,
      );
      const potentialMatches = await this.getPotentialMatches(
        job,
        userData.difficulty,
        userData.topics,
      );

      if (Object.keys(potentialMatches).length === 0) {
        // no potential matches found for user
        logger.info(
          `[handleMatchJob] No potential matches for user ${job.userId}. Adding user to matching pool.`,
        );
        await this.addUserToMatchingPool(job);
        return;
      }

      // get a matching id
      const matchingId = await this.matchingRedis.getNextMatchId();
      logger.info(
        `[handleMatchJob] Generated matchingId ${matchingId} for user ${job.userId}.`,
      );

      // get a match
      const matchData = await this.getMatch(
        potentialMatches,
        userData.difficulty,
        matchingId,
      );

      if (!matchData) {
        logger.info(
          `[handleUser] No valid match found for ${job.userId}. Adding to matching pool.`,
        );
        await this.addUserToMatchingPool(job);
        return;
      }

      logger.info(
        `[handleUser] Match found! ${job.userId} <> ${matchData.matchedUserId}, questionId=${matchData.questionId}`,
      );
      await this.finaliseMatch(
        matchingId,
        job.userId,
        matchData.matchedUserId,
        matchData.questionId,
      );
    } catch (error) {
      logger.error(
        `[handleMatchJob] Failed to handle match job ${JSON.stringify(job)}.`,
        error,
      );
    }
  }

  /**
   * Checks if a match job should be carried out by checking:
   * * Session key to check that job is not outdated.
   * * Last seen to check that user is not disconnected.
   * * TTL remaining to ensure enough TTL remaining for matching worker to complete matching.
   * * Status to check user is still available for matching.
   *
   * @param job Job containing information to check for eligibility.
   * @param userData User data from status hash to check job against.
   * @returns True if matching job can be carried out, false if job is not eligible.
   */
  public async canMatchUser(
    job: EntryQueueData,
    userData: HashData,
  ): Promise<boolean> {
    if (job.sessionKey !== userData.sessionKey) {
      logger.info(
        `[canMatchUser] Job is outdated job.sessionKey=${job.sessionKey}, statusHash.sessionKey=${userData.sessionKey}. Skip job.`,
      );
      return false;
    }

    // check disconnected
    const now = Date.now();
    if (now - userData.lastSeen > DISCONNECT_THRESHOLD) {
      logger.info(
        `[canMatchUser] User ${job.userId} detected to have disconnected.`,
      );

      const newJob: EntryQueueData = {
        jobType: 'clear_user',
        userId: job.userId,
        sessionKey: job.sessionKey,
        userData: userData,
      };

      await Promise.all([
        this.matchingRedis.statusHash.updateUserStatus(
          job.userId,
          'disconnected',
        ),
        this.matchingRedis.statusHash.setUserTTL(job.userId, 60),
        this.matchingRedis.entryQueue.enqueue(newJob),
      ]);

      return false;
    }

    // check ttl remaining and status
    const ttl = await this.matchingRedis.statusHash.getUserTTL(job.userId);
    if (
      ttl === null ||
      ttl < MIN_TTL_TO_HANDLE ||
      userData.status !== 'waiting'
    ) {
      logger.info(
        `[canMatchUser] Skipping ${job.userId}, TTL=${ttl}, status=${userData.status}`,
      );
      return false;
    }

    logger.info(
      `[canMatchUser] Job ${JSON.stringify(job)} can be handled for matching.`,
    );
    return true;
  }

  /**
   * Scans the matching pool, reads from the head for each queue and gets a dictionary of potential matches and common topics.
   * The function also checks if match is eligible (not timed-out, not disconnected, not outdated)
   *
   * @param job Match job.
   * @param difficulty difficulty queues to scan.
   * @param topics topic queues to scan.
   * @returns A dictionary with key: potential users to match(id), value: matching pool data, common topics matched on.
   */
  public async getPotentialMatches(
    job: EntryQueueData,
    difficulty: string,
    topics: string[],
  ): Promise<Record<string, { data: MatchingPoolData; topics: string[] }>> {
    const result: Record<string, { data: MatchingPoolData; topics: string[] }> =
      {};

    for (const topic of topics) {
      let done = false;

      while (!done) {
        const user: MatchingPoolData | null =
          await this.matchingRedis.matchingPool.peekQueue(difficulty, topic);

        if (!user) {
          // no more users in the queue
          logger.info(
            `[getPotentialMatches] No users found in queue for topic='${topic}'`,
          );
          done = true;
          break;
        }

        // ensure not matching with self
        if (job.userId === user.userId) {
          logger.warn(
            `[getPotentialMatches] Skipping self (${job.userId}) in queue.`,
          );
          await this.matchingRedis.matchingPool.removeUser(user, difficulty, [
            topic,
          ]);
          continue;
        }

        // check if matched user is disconnected / timed-out / updated
        const userData = await this.matchingRedis.statusHash.getUserData(
          user.userId,
        );
        if (!userData) {
          await Promise.all([
            this.matchingRedis.matchingPool.removeUser(user, difficulty, [
              topic,
            ]),
            this.matchingRedis.fcfsList.removeUser(user),
          ]);
          continue;
        }

        if (user.sessionKey !== userData.sessionKey) {
          // user dequeued outdated
          await Promise.all([
            this.matchingRedis.matchingPool.removeUser(user, difficulty, [
              topic,
            ]),
            this.matchingRedis.fcfsList.removeUser(user),
          ]);
          continue;
        }

        const now = Date.now();
        if (now - userData.lastSeen > DISCONNECT_THRESHOLD) {
          logger.info(
            `[getPotentialMatches] User ${user.userId} disconnected (lastSeen=${userData.lastSeen}, now=${now}), queuing clear job`,
          );

          const newJob: EntryQueueData = {
            jobType: 'clear_user',
            userId: user.userId,
            sessionKey: user.sessionKey,
            userData: userData,
          };

          await Promise.all([
            this.matchingRedis.matchingPool.removeUser(user, difficulty, [
              topic,
            ]),
            this.matchingRedis.fcfsList.removeUser(user),
            this.matchingRedis.statusHash.updateUserStatus(
              user.userId,
              'disconnected',
            ),
            this.matchingRedis.statusHash.setUserTTL(user.userId, 60),
            this.matchingRedis.entryQueue.enqueue(newJob),
          ]);

          continue;
        }

        if (userData.status !== 'waiting') {
          await Promise.all([
            this.matchingRedis.matchingPool.removeUser(user, difficulty, [
              topic,
            ]),
            this.matchingRedis.fcfsList.removeUser(user),
          ]);
          continue;
        }

        // potential match found
        if (!result[user.userId]) {
          result[user.userId] = { data: user, topics: [] };
        }
        result[user.userId].topics.push(topic);

        logger.info(
          `[getPotentialMatches] Found potential match: user=${user.userId}, topics=${result[user.userId].topics.join(', ')}`,
        );

        done = true;
      }
    }
    return result;
  }

  /**
   * Adds a user to the matching pool (with id and session key), then sets user's status back to 'waiting'.
   * @param job Job containing information of user to add to the matching pool.
   */
  public async addUserToMatchingPool(job: EntryQueueData): Promise<void> {
    try {
      const userData = await this.matchingRedis.statusHash.getUserData(
        job.userId,
      );
      if (!userData) {
        logger.info(
          `[addUserToMatchingPool] User ${job.userId} not added to matching pool as user is not found in status hash.`,
        );
        return;
      }
      if (job.sessionKey !== userData.sessionKey) {
        logger.info(
          `[addUserToMatchingPool] User ${job.userId} not added to matching pool as job is outdated.`,
        );
        return;
      }
      if (userData.status === 'disconnected') {
        return;
      }

      // detect disconnected
      const now = Date.now();
      if (now - userData.lastSeen > DISCONNECT_THRESHOLD) {
        logger.info(
          `[addUserToMatchingPool] User ${job.userId} not added to matching pool user seems to have disconnected.`,
        );

        const newJob: EntryQueueData = {
          jobType: 'clear_user',
          userId: job.userId,
          sessionKey: job.sessionKey,
          userData: userData,
        };

        await Promise.all([
          this.matchingRedis.statusHash.updateUserStatus(
            job.userId,
            'disconnected',
          ),
          this.matchingRedis.statusHash.setUserTTL(job.userId, 60),
          this.matchingRedis.entryQueue.enqueue(newJob),
        ]);
        return;
      }

      // add to matching pool
      const user: MatchingPoolData = {
        userId: job.userId,
        sessionKey: job.sessionKey,
      };
      await Promise.all([
        this.matchingRedis.matchingPool.enqueueUser(
          user,
          userData.difficulty,
          userData.topics,
        ),
        this.matchingRedis.fcfsList.enqueueUser(user),
        this.matchingRedis.statusHash.updateUserStatus(job.userId, 'waiting'),
      ]);

      logger.info(
        `[addUserToMatchingPool] Added user=${job.userId} to matching pool. difficulty=${userData.difficulty}, topics=${userData.topics.join(', ')}`,
      );
    } catch (error) {
      logger.error(
        `[addUserToMatchingPool] Error adding user=${job.userId}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Selects a match from list of potential matches.
   * * Gets position of user from FCFS list.
   * * Check user is not outdated, disconnected, timed-out, cancelled.
   * * Checks if user and match can obtain a matching ID from the question service.
   *
   * @param potentialMatches list of potential matches and the common topics
   * @param difficulty difficulty selected by users (to get question)
   * @param matchingId assigned matching id for the match
   * @returns user ID of matched user and question id
   */
  public async getMatch(
    potentialMatches: Record<
      string,
      { data: MatchingPoolData; topics: string[] }
    >,
    difficulty: string,
    matchingId: string,
  ): Promise<{ matchedUserId: string; questionId: string } | null> {
    logger.info(`[getMatch] Finding match for matchingId ${matchingId}.`);

    const userIds = Object.keys(potentialMatches);
    if (userIds.length === 0) {
      logger.info(`[getMatch] No potential matches found for ${matchingId}.`);
      return null;
    }

    const idPositions: { userId: string; position: number }[] = [];
    for (const userId of userIds) {
      const { data, topics } = potentialMatches[userId];
      const position = await this.matchingRedis.fcfsList.getUserPosition(data);

      if (!position) {
        logger.info(`[getMatch] User ${userId} not found in FCFS, skipping`);
        continue;
      }

      logger.info(
        `[getMatch] User ${userId} found in FCFS at position ${position}`,
      );
      idPositions.push({ userId: userId, position: position });
    }

    if (idPositions.length === 0) {
      logger.info('[getMatch] No valid IDs found in FCFS list.');
      return null;
    }
    const sortedIds = idPositions.sort((a, b) => a.position - b.position);
    logger.info(
      `[getMatch] Sorted valid IDs by position: ${sortedIds.map((x) => x.userId).join(', ')}`,
    );

    for (const { userId } of sortedIds) {
      const userData = await this.matchingRedis.statusHash.getUserData(userId);

      // checks
      if (
        !userData ||
        userData.status !== 'waiting' ||
        potentialMatches[userId].data.sessionKey !== userData.sessionKey
      ) {
        logger.info(`[getMatch] Skipping ${userId}, not valid for matching.`);
        continue;
      }
      if (Date.now() - userData.lastSeen > DISCONNECT_THRESHOLD) {
        logger.info(
          `[getMatch] Skipping ${userId}, user seems to have disconnected.`,
        );
        const newJob: EntryQueueData = {
          jobType: 'clear_user',
          userId: userId,
          sessionKey: userData.sessionKey,
          userData: userData,
        };

        await Promise.all([
          this.matchingRedis.statusHash.updateUserStatus(
            userId,
            'disconnected',
          ),
          this.matchingRedis.statusHash.setUserTTL(userId, 60),
          this.matchingRedis.entryQueue.enqueue(newJob),
        ]);
        continue;
      }

      const commonTopics = potentialMatches[userId].topics;
      const questionId = await getQuestionId(
        matchingId,
        difficulty,
        commonTopics,
      );

      if (questionId) {
        logger.info(
          `[getMatch] Match found! User ${userId} with questionId ${questionId}`,
        );
        return { matchedUserId: userId, questionId: questionId };
      } else {
        logger.info(
          `[getMatch] No questionId returned for ${userId}, continuing`,
        );
        continue;
      }
    }

    logger.info('[getMatch] No match could be found.');
    return null;
  }

  /**
   * Finalises match by removing user from matching pool, setting matching status to 'matched' and setting matching Id
   * Sets matched hash in redis for collab service and publishes message to collab service.
   * @param matchingId matching ID assigned to match
   * @param userAId id of user
   * @param userBId id of matched user (to remove from matching pool)
   * @param questionId question id of question assigned to match
   */
  public async finaliseMatch(
    matchingId: string,
    userAId: string,
    userBId: string,
    questionId: string,
  ): Promise<void> {
    logger.info(
      `[finaliseMatch] Finalising match ${matchingId}: ${userAId} <> ${userBId}`,
    );

    try {
      await Promise.all([
        this.matchingRedis.statusHash.setUserTTL(userAId, 120),
        this.matchingRedis.statusHash.setUserTTL(userBId, 120),
      ]);

      await Promise.all([
        this.matchingRedis.statusHash.updateMatchingId(userAId, matchingId),
        this.matchingRedis.statusHash.updateUserStatus(userAId, 'matched'),
        this.matchingRedis.statusHash.updateMatchingId(userBId, matchingId),
        this.matchingRedis.statusHash.updateUserStatus(userBId, 'matched'),
      ]);

      // add to redis for collaboration service to consume
      await this.matchingRedis.setMatchingHash(
        matchingId,
        userAId,
        userBId,
        questionId,
      );

      // send matching id to collaboration service
      this.matchingMessenger.publishToCollaborationService(matchingId);

      // remove user B from matching pool and fcfs queue (user A shouldn't be in matching pool)
      const userBData =
        await this.matchingRedis.statusHash.getUserData(userBId);
      if (!userBData) {
        logger.warn(
          `[finaliseMatch] Problem with retrieving user B's data from status hash - inconsistency!`,
        );
        return;
      }
      const userB: MatchingPoolData = {
        userId: userBId,
        sessionKey: userBData.sessionKey,
      };
      await Promise.all([
        this.matchingRedis.matchingPool.removeUser(
          userB,
          userBData.difficulty,
          userBData.topics,
        ),
        this.matchingRedis.fcfsList.removeUser(userB),
      ]);

      logger.info(
        `[finaliseMatch] Match ${matchingId} completed successfully.`,
      );
    } catch (error) {
      logger.error(`[finaliseMatch] Error during match finalization: ${error}`);
    }
  }
}
