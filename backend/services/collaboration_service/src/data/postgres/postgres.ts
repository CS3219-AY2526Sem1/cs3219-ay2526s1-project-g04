import { PrismaClient } from '../../../generated/prisma/index.js';

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
  ): Promise<number> {
    const sessionDataObj = await this.prismaClient.session.create({
      data: {
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
}
