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
}
