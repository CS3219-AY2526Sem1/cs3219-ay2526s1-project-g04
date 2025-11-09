// tests/unit/topic.controller.validation.test.ts
import { jest } from '@jest/globals';
import type { Request, Response } from 'express';
import * as TopicController from '../../src/controllers/TopicController.js';

function mockReq(query: any = {}): Request {
  return {
    query,
    ip: '127.0.0.1',
    get: (h: string) => (h.toLowerCase() === 'user-agent' ? 'jest' : undefined),
    user: undefined,
  } as unknown as Request;
}

function mockRes(): Response {
  const res = {} as unknown as Response;
  (res.status as any) = jest.fn().mockReturnValue(res);
  (res.json as any) = jest.fn().mockReturnValue(res);
  return res;
}

describe('TopicController.listPublished', () => {
  it('returns 400 when difficulty is missing', async () => {
    const req = mockReq({});
    const res = mockRes();

    await TopicController.listPublished(req, res);

    expect(res.status as any).toHaveBeenCalledWith(400);
    expect(res.json as any).toHaveBeenCalledWith({
      error: 'invalid_or_missing_difficulty',
    });
  });

  it('returns 400 when difficulty is invalid', async () => {
    const req = mockReq({ difficulty: 'bananas' });
    const res = mockRes();

    await TopicController.listPublished(req, res);

    expect(res.status as any).toHaveBeenCalledWith(400);
    expect(res.json as any).toHaveBeenCalledWith({
      error: 'invalid_or_missing_difficulty',
    });
  });
});
