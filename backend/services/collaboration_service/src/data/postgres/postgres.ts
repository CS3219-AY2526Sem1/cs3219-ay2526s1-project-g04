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

  public async getPastSessionsByUser(userId: number) {
    return await this.prismaClient.session.findMany({
      where: {
        terminationStatus: 1,
        users: {
          OR: [{ UserAId: userId }, { UserBId: userId }],
        },
      },
      select: {
        id: true,
        questionId: true,
        users: {
          select: {
            UserAId: true,
            UserBId: true,
          },
        },
      },
    });
  }

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
}
