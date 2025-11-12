import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';

// mock authenticateToken
const mockAuthenticateToken = (req: any, res: any, next: any) => {
  req.user = { userId: 'test-user' };
  return next();
};

const mockIsUser = (req: any, res: any, next: any) => next();
const mockIsAdmin = (req: any, res: any, next: any) => next();

let registerMatchRoutes: typeof import('../../src/api/routes.js').registerMatchRoutes;

// function to create a fresh mock redis for each test
function createMockRedis() {
  return {
    entryQueue: {
      enqueue: jest.fn(),
      clearQueue: jest.fn(),
    },
    statusHash: {
      getUserData: jest.fn(),
      addUser: jest.fn(),
      updateLastSeen: jest.fn(),
      getUserTTL: jest.fn(),
      updateUserStatus: jest.fn(),
      extendUserTTL: jest.fn(),
      clearAllUsers: jest.fn(),
      clearAllTTLs: jest.fn(),
    },
  } as unknown as any;
}

describe('match routes', () => {
  let app: express.Application;
  let redisMock: ReturnType<typeof createMockRedis>;

  beforeEach(async () => {
    await jest.unstable_mockModule('../../src/middleware/auth.js', () => ({
      authenticateToken: mockAuthenticateToken,
      isUser: mockIsUser,
      isAdmin: mockIsAdmin,
    }));

    const routes = await import('../../src/api/routes.js');
    registerMatchRoutes = routes.registerMatchRoutes;

    app = express();
    app.use(express.json());
    redisMock = createMockRedis();
    registerMatchRoutes(app, redisMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  /**
   * POST /match/request
   */
  describe('POST /match/request', () => {
    it('returns 400 when request body is missing difficuly or topics', async () => {
      const res = await request(app)
        .post('/match/request')
        .send({})
        .expect(400);
      expect(res.body.message).toMatch(/Invalid request/);
    });

    it('returns 400 if user already has a pending request', async () => {
      redisMock.statusHash.getUserData.mockResolvedValue({ status: 'waiting' });

      const res = await request(app)
        .post('/match/request')
        .send({ difficulty: 'easy', topics: ['arrays'] })
        .expect(400);

      expect(redisMock.statusHash.getUserData).toHaveBeenCalledWith(
        'test-user',
      );
      expect(res.body.message).toMatch(/pending match request/);
    });
  });

  /**
   * GET /match/status
   */
  describe('GET /match/status', () => {
    it('returns 404 if user is not found', async () => {
      redisMock.statusHash.getUserData.mockResolvedValue(null);

      const res = await request(app).get('/match/status').expect(404);
      expect(res.body.message).toMatch(/User not found/);
    });

    it('returns status and remainingTime if user is waiting', async () => {
      redisMock.statusHash.getUserData.mockResolvedValue({ status: 'waiting' });
      redisMock.statusHash.getUserTTL.mockResolvedValue(30);

      const res = await request(app).get('/match/status').expect(200);
      expect(res.body.status).toBe('waiting');
      expect(res.body.remainingTime).toBe(30);
    });

    it('returns status and matchingId if user is matched', async () => {
      redisMock.statusHash.getUserData.mockResolvedValue({
        status: 'matched',
        matchingId: 'abc123',
      });

      const res = await request(app).get('/match/status').expect(200);
      expect(res.body.status).toBe('matched');
      expect(res.body.matchingId).toBe('abc123');
    });
  });

  /**
   * DELETE /match/cancel
   */
  describe('DELETE /match/cancel', () => {
    it('returns 404 if user not found', async () => {
      redisMock.statusHash.getUserData.mockResolvedValue(null);

      const res = await request(app).delete('/match/cancel').expect(404);
      expect(res.body.message).toMatch(/User not found/);
    });

    it('returns 400 if user cannot cancel', async () => {
      redisMock.statusHash.getUserData.mockResolvedValue({ status: 'matched' });

      const res = await request(app).delete('/match/cancel').expect(400);
      expect(res.body.message).toMatch(/Cannot cancel match request/);
    });

    it('successfully cancels user if status is waiting', async () => {
      const userData = { status: 'waiting', sessionKey: 12345 };
      redisMock.statusHash.getUserData.mockResolvedValue(userData);

      const res = await request(app).delete('/match/cancel').expect(200);
      expect(redisMock.statusHash.updateUserStatus).toHaveBeenCalledWith(
        'test-user',
        'cancelled',
      );
      expect(redisMock.entryQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'test-user' }),
      );
      expect(res.body.message).toMatch(
        /Matching request cancelled successfully/,
      );
    });
  });
});
