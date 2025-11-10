import express from 'express';
import { MatchingServiceRedis } from '../clients/redis/redis_client.js';
import { logger } from '../logger/logger.js';
import type { Response } from 'express';
import type { HashData, EntryQueueData } from '../clients/redis/types.js';
import type { AuthRequest } from '../middleware/auth.js';
import { authenticateToken } from '../middleware/auth.js';

export async function registerMatchRoutes(
  app: express.Application,
  redis: MatchingServiceRedis,
) {
  /**
   * POST /match/request
   * Request to be matched
   */
  app.post(
    '/match/request',
    authenticateToken,
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.user!.userId;
        const { difficulty, topics } = req.body; // userId should be from token (future implementation)

        if (!difficulty || !topics) {
          logger.info(
            `[POST /match/request] Invalid request body: ${JSON.stringify(req.body)}`,
          );
          return res.status(400).json({
            message: 'Invalid request: missing userId, difficulty, or topics',
          });
        }

        logger.info(
          `[POST /match/request] Received match request from user ${userId} with difficulty=${difficulty} and topics=${topics.join(', ')}`,
        );

        const existingUser = await redis.statusHash.getUserData(userId);
        if (existingUser) {
          logger.info(
            `[POST /match/request] User ${userId} already has a pending match request.`,
          );
          return res.status(400).json({
            message:
              'Use already has a pending match request. Please try again in a few minutes.',
          });
        }

        // add the user into the status hash and the entry queue
        const userData: HashData = {
          sessionKey: Date.now(),
          status: 'waiting',
          difficulty: difficulty,
          topics: topics,
          lastSeen: Date.now(),
        };
        const userMatchJob: EntryQueueData = {
          jobType: 'match_user',
          userId: userId,
          sessionKey: userData.sessionKey,
        };

        await Promise.all([
          redis.statusHash.addUser(userId, userData),
          redis.entryQueue.enqueue(userMatchJob),
        ]);

        logger.info(
          `[POST /match/request] Request from user ${userId} successfully processed.`,
        );
        res.status(200).json({
          message: 'Request accepted. User queued.',
        });
      } catch (error) {
        logger.error(`[POST /match/request] Error: `, error);
        res.status(500).json({
          message: 'Internal server error',
        });
      }
    },
  );

  /**
   * GET /match/status/{userId}
   * Get the current status of the user in the matching service
   */
  app.get(
    '/match/status',
    authenticateToken,
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.user!.userId;
        if (!userId) {
          logger.info(`[GET /match/status] Missing userId in request`);
          return res.status(400).json({
            message: 'Missing userId',
          });
        }

        logger.info(`[GET /match/status] Fetching status for user ${userId}`);

        const userData = await redis.statusHash.getUserData(userId as string);
        if (!userData) {
          logger.info(`[GET /match/status] User ${userId} not found`);
          return res.status(404).json({
            message: 'User not found',
          });
        }

        await redis.statusHash.updateLastSeen(userId as string, Date.now());

        let remainingTime: number | null = null;
        let matchingId: string | undefined = undefined;
        const status = userData.status;

        if (status === 'waiting' || status === 'matching') {
          remainingTime = await redis.statusHash.getUserTTL(userId as string);
          if (remainingTime === null) {
            logger.warn(
              `[GET /match/status] TTL missing for user ${userId} with status=${status}`,
            );
            return res.status(404).json({
              message: 'User TTL not found; user may not be queued properly',
            });
          }
        } else if (status === 'matched') {
          matchingId = userData.matchingId;
        }

        logger.info(
          `[GET /match/status] Returning status=${status} remainingTime=${remainingTime} matchingId=${matchingId}`,
        );

        res.status(200).json({
          status,
          remainingTime,
          matchingId,
        });
      } catch (error) {
        logger.error(`[GET /match/status] Error: `, error);
        res.status(500).json({
          message: 'Internal server error',
        });
      }
    },
  );

  /**
   * DELETE /match/cancel/{userId}
   * Cancel request to be matched
   */
  app.delete(
    '/match/cancel',
    authenticateToken,
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.user!.userId;
        if (!userId) {
          logger.info(
            `[DELETE /match/cancel] userId not specified in cancel request.`,
          );
          return res.status(400).json({
            message: 'Missing userId',
          });
        }

        logger.info(
          `[DELETE /match/cancel] Received cancel request from user ${userId}.`,
        );

        const userData = await redis.statusHash.getUserData(userId);
        if (!userData) {
          logger.info(
            `[DELETE /match/cancel] User ${userId} not found in status hash.`,
          );
          return res.status(404).json({
            message: 'User not found',
          });
        }

        if (userData.status === 'matched' || userData.status === 'matching') {
          logger.info(
            `[DELETE /match/cancel] User ${userId} cannot cancel, status=${userData.status}.`,
          );
          return res.status(400).json({
            message: `Cannot cancel match request because user status is '${userData.status}'`,
          });
        }

        if (userData.status === 'waiting') {
          const clearJob: EntryQueueData = {
            jobType: 'clear_user',
            userId: userId,
            sessionKey: userData.sessionKey,
            userData: userData,
          };

          await Promise.all([
            redis.statusHash.updateUserStatus(userId, 'cancelled'),
            redis.statusHash.extendUserTTL(userId, 60),
            redis.entryQueue.enqueue(clearJob),
          ]);
        }

        res.status(200).json({
          message: 'Matching request cancelled successfully',
        });
      } catch (error) {
        logger.error(`[DELETE /match/cancel] Error: `, error);
        res.status(500).json({
          message: 'Internal server error',
        });
      }
    },
  );
}
