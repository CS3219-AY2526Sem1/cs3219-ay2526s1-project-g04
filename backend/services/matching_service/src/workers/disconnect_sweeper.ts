import { MatchingServiceRedis } from '../clients/redis/redis_client.js';
import { EntryQueueData } from '../clients/redis/types.js';
import { logger } from '../logger/logger.js';

const INTERVAL = 10000;
const DISCONNECT_THRESHOLD = 30 * 1000;

export class DisconnectSweeper {
  private matchingRedis: MatchingServiceRedis;
  private isSweeping: boolean;

  constructor(matchingRedis: MatchingServiceRedis, isSweeping: boolean) {
    this.matchingRedis = matchingRedis;
    this.isSweeping = isSweeping;
  }

  public start(): void {
    logger.info(`[DisconnectSweeper] Disconnect sweeper started.`);
    setInterval(() => this.sweepDisconnectedUsers(), INTERVAL);
  }

  public async sweepDisconnectedUsers(): Promise<void> {
    if (this.isSweeping) {
      logger.info(
        `[DisconnectSweeper] Previous sweeping incompleted, skipping call to sweeper.`,
      );
      return;
    }

    logger.info(`[DisconnectSweeper] Sweeping starting.`);
    this.isSweeping = true;
    try {
      const allUsers = await this.matchingRedis.statusHash.getAllUsers();
      const now = Date.now();

      if (allUsers === null) {
        return;
      }

      for (const [userId, data] of Object.entries(allUsers)) {
        const lastSeen = data.lastSeen;
        const status = data.status;

        if (!lastSeen) continue;

        if (now - lastSeen > DISCONNECT_THRESHOLD && status == 'waiting') {
          logger.info(
            `[DisconnectSweeper] User ${userId} detected to have disconnected.`,
          );
          const clearJob: EntryQueueData = {
            jobType: 'clear_user',
            userId: userId,
            sessionKey: data.sessionKey,
            userData: data,
          };
          await Promise.all([
            this.matchingRedis.statusHash.updateUserStatus(
              userId,
              'disconnected',
            ),
            this.matchingRedis.entryQueue.enqueue(clearJob),
            this.matchingRedis.statusHash.setUserTTL(userId, 60),
          ]);
        }
      }
    } catch (err) {
      console.error('[DisconnectSweeper] Error during sweep:', err);
    } finally {
      this.isSweeping = false;
      logger.info(`[DisconnectSweeper] Sweeping completed.`);
    }
  }
}
