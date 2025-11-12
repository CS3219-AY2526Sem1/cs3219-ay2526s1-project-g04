import { PrismaClient } from '../../../generated/prisma/index.js';
import type { SessionTerminations } from '../../session/session_manager.js';

export class PostgresPrisma {
  private static instance: PostgresPrisma;
  private prismaClient;

  private constructor() {
    this.prismaClient = new PrismaClient();
  }

  public static getInstance() {
    if (!PostgresPrisma.instance) {
      PostgresPrisma.instance = new PostgresPrisma();
    }
    return PostgresPrisma.instance;
  }

  // Creates a new session record with associated users and an empty code document
  public async createSessionDataModel(
    UserAId: number,
    userBId: number,
    questionId: string,
  ): Promise<number> {
    const sessionDataObj = await this.prismaClient.session.create({
      data: {
        questionId: questionId,
        codeDocument: {
          create: {},
        },
        users: {
          create: {
            UserAId: UserAId,
            UserBId: userBId,
          },
        },
      },
    });
    return sessionDataObj.id;
  }

  // Retrieves all previously ended sessions (terminationStatus = 0) for a given user
  public async getPastSessionsByUser(userId: number) {
    return await this.prismaClient.session.findMany({
      where: {
        terminationStatus: 0,
        users: {
          OR: [{ UserAId: userId }, { UserBId: userId }],
        },
      },
      select: {
        id: true,
        questionId: true,
        solved: true,
        endedAt: true,
        users: {
          select: {
            UserAId: true,
            UserBId: true,
          },
        },
      },
    });
  }

  // Returns the questionId linked to a specific sessionId
  public async getQuestionIdBySessionId(
    sessionId: number,
  ): Promise<string | null | undefined> {
    const session = await this.prismaClient.session.findUnique({
      where: {
        id: sessionId,
      },
      select: {
        questionId: true,
      },
    });

    return session?.questionId;
  }

  // Updates a session’s termination status and logs its end timestamp
  public async setTerminationSession(
    sessionId: number,
    terminationStatus: SessionTerminations,
  ): Promise<void> {
    await this.prismaClient.session.update({
      where: { id: sessionId },
      data: {
        terminationStatus: terminationStatus.valueOf(),
        endedAt: new Date(),
      },
    });
  }

  // Marks a session as solved after both users successfully complete the code
  public async setCodePassedBySession(sessionId: number): Promise<void> {
    await this.prismaClient.session.update({
      where: { id: sessionId },
      data: {
        solved: true,
      },
    });
  }
}
