import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Response } from 'express';
import type { AuthRequest } from '../../src/middleware/auth.js';
import { Role, type JwtPayload } from '../../src/middleware/auth.js';

jest.unstable_mockModule(
  '../../src/repositories/QuestionRepository.js',
  () => ({
    getPublicResourcesBundle: jest.fn(),
    getInternalResourcesBundle: jest.fn(),
  }),
);

jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const QuestionRepository = await import(
  '../../src/repositories/QuestionRepository.js'
);
const { log } = await import('../../src/utils/logger.js');
const { getPublicQuestionResources, getAdminQuestionResources } = await import(
  '../../src/controllers/ResourceController.js'
);

type TestCase = {
  input: string;
  expected: string;
  visibility: 'sample' | 'hidden';
};
type ResourcesPayload = {
  starter_code: Record<string, string>;
  test_cases: TestCase[];
};

// Cast mocked functions so `mockResolvedValue(...)` does NOT infer `never`
const mockGetPublic =
  QuestionRepository.getPublicResourcesBundle as unknown as jest.MockedFunction<
    (id: string) => Promise<ResourcesPayload | null>
  >;

const mockGetInternal =
  QuestionRepository.getInternalResourcesBundle as unknown as jest.MockedFunction<
    (id: string) => Promise<ResourcesPayload | null>
  >;

/** Helper to make a valid JwtPayload for AuthRequest.user */
const makeJwt = (overrides: Partial<JwtPayload> = {}): JwtPayload => ({
  userId: 'user-000',
  username: 'tester',
  role: Role.USER,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 300,
  ...overrides,
});

describe('ResourcesController - Unit Tests', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Response;

  // Keep separate references if you assert on them a lot
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // ---- Properly typed Express Response mock ----
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();

    // Cast each method to the exact Express signature so TS is happy
    const json = mockJson as unknown as Response['json'];
    const status = mockStatus as unknown as Response['status'];
    mockResponse = { json, status } as unknown as Response;

    // ---- Request mock ----
    // Express `req.get` has overloads; implement a real function instead of jest.fn()
    const getHeader = ((name: string) => {
      if (name.toLowerCase() === 'user-agent') return 'test-user-agent';
      if (name.toLowerCase() === 'set-cookie') return undefined as any; // matches specific overload
      return undefined;
    }) as AuthRequest['get'];

    mockRequest = {
      params: {},
      ip: '127.0.0.1',
      get: getHeader,
    };
  });

  describe('getPublicQuestionResources', () => {
    describe('validation', () => {
      it('returns 400 when id param is missing', async () => {
        mockRequest.params = {};

        await getPublicQuestionResources(
          mockRequest as AuthRequest,
          mockResponse,
        );

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({ error: 'id param required' });
        expect(log.warn).toHaveBeenCalled();
      });

      it('returns 400 when id is empty string', async () => {
        mockRequest.params = { id: '' };

        await getPublicQuestionResources(
          mockRequest as AuthRequest,
          mockResponse,
        );

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({ error: 'id param required' });
      });

      it('returns 400 when id is only whitespace', async () => {
        mockRequest.params = { id: '   ' };

        await getPublicQuestionResources(
          mockRequest as AuthRequest,
          mockResponse,
        );

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({ error: 'id param required' });
      });

      it('trims whitespace from id parameter', async () => {
        mockRequest.params = { id: '  test-id  ' };
        const mockPayload: ResourcesPayload = {
          starter_code: {},
          test_cases: [],
        };

        mockGetPublic.mockResolvedValue(mockPayload);

        await getPublicQuestionResources(
          mockRequest as AuthRequest,
          mockResponse,
        );

        expect(mockGetPublic).toHaveBeenCalledWith('test-id');
      });
    });

    describe('successful responses', () => {
      it('returns resources for published question', async () => {
        mockRequest.params = { id: 'question-123' };
        const mockPayload: ResourcesPayload = {
          starter_code: {
            python: 'def solution():',
            javascript: 'function solution() {}',
          },
          test_cases: [{ input: '[1,2]', expected: '3', visibility: 'sample' }],
        };

        mockGetPublic.mockResolvedValue(mockPayload);

        await getPublicQuestionResources(
          mockRequest as AuthRequest,
          mockResponse,
        );

        expect(mockGetPublic).toHaveBeenCalledWith('question-123');
        expect(mockJson).toHaveBeenCalledWith(mockPayload);
        expect(mockStatus).not.toHaveBeenCalled();
        expect(log.info).toHaveBeenCalled();
      });

      it('returns resources with empty starter_code', async () => {
        mockRequest.params = { id: 'question-456' };
        const mockPayload: ResourcesPayload = {
          starter_code: {},
          test_cases: [],
        };

        mockGetPublic.mockResolvedValue(mockPayload);

        await getPublicQuestionResources(
          mockRequest as AuthRequest,
          mockResponse,
        );

        expect(mockJson).toHaveBeenCalledWith(mockPayload);
      });

      it('logs user info when authenticated', async () => {
        mockRequest.params = { id: 'question-789' };
        mockRequest.user = makeJwt({ userId: 'user-123', role: Role.USER });
        const mockPayload: ResourcesPayload = {
          starter_code: {},
          test_cases: [],
        };

        mockGetPublic.mockResolvedValue(mockPayload);

        await getPublicQuestionResources(
          mockRequest as AuthRequest,
          mockResponse,
        );

        expect(log.info).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ role: Role.USER, userId: 'user-123' }),
        );
      });
    });

    describe('not found scenarios', () => {
      it('returns 404 when question not found', async () => {
        mockRequest.params = { id: 'non-existent' };

        mockGetPublic.mockResolvedValue(null);

        await getPublicQuestionResources(
          mockRequest as AuthRequest,
          mockResponse,
        );

        expect(mockStatus).toHaveBeenCalledWith(404);
        expect(mockJson).toHaveBeenCalledWith({ error: 'not_found' });
        expect(log.warn).toHaveBeenCalled();
      });

      it('returns 404 when question is not published', async () => {
        mockRequest.params = { id: 'draft-question' };

        mockGetPublic.mockResolvedValue(null);

        await getPublicQuestionResources(
          mockRequest as AuthRequest,
          mockResponse,
        );

        expect(mockStatus).toHaveBeenCalledWith(404);
        expect(mockJson).toHaveBeenCalledWith({ error: 'not_found' });
      });
    });

    describe('error handling', () => {
      it('returns 500 on repository error', async () => {
        mockRequest.params = { id: 'question-error' };

        mockGetPublic.mockRejectedValue(
          new Error('Database connection failed'),
        );

        await getPublicQuestionResources(
          mockRequest as AuthRequest,
          mockResponse,
        );

        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalledWith({ error: 'internal_error' });
        expect(log.error).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            error: 'Database connection failed',
            stack: expect.any(String),
          }),
        );
      });

      it('handles non-Error exceptions', async () => {
        mockRequest.params = { id: 'question-weird-error' };

        mockGetPublic.mockRejectedValue('string error');

        await getPublicQuestionResources(
          mockRequest as AuthRequest,
          mockResponse,
        );

        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalledWith({ error: 'internal_error' });
        expect(log.error).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ error: 'string error' }),
        );
      });
    });
  });

  describe('getAdminQuestionResources', () => {
    beforeEach(() => {
      mockRequest.user = makeJwt({ userId: 'admin-123', role: Role.ADMIN });
    });

    describe('authentication and authorization', () => {
      it('returns 403 when user is not admin', async () => {
        mockRequest.params = { id: 'question-123' };
        mockRequest.user = makeJwt({ userId: 'user-456', role: Role.USER });

        await getAdminQuestionResources(
          mockRequest as AuthRequest,
          mockResponse,
        );

        expect(mockStatus).toHaveBeenCalledWith(403);
        expect(mockJson).toHaveBeenCalledWith({
          message: 'Access denied. Admins only.',
        });
        expect(log.warn).toHaveBeenCalled();
        expect(mockGetInternal).not.toHaveBeenCalled();
      });

      it('returns 403 when user role is undefined', async () => {
        mockRequest.params = { id: 'question-123' };
        // force bad role via cast only in test
        mockRequest.user = makeJwt({
          userId: 'user-789',
          role: undefined as any,
        });

        await getAdminQuestionResources(
          mockRequest as AuthRequest,
          mockResponse,
        );

        expect(mockStatus).toHaveBeenCalledWith(403);
        expect(mockJson).toHaveBeenCalledWith({
          message: 'Access denied. Admins only.',
        });
      });
    });

    describe('validation', () => {
      it('returns 400 when id param is missing', async () => {
        mockRequest.params = {};

        await getAdminQuestionResources(
          mockRequest as AuthRequest,
          mockResponse,
        );

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({ error: 'id param required' });
        expect(log.warn).toHaveBeenCalled();
      });

      it('returns 400 when id is empty string', async () => {
        mockRequest.params = { id: '' };

        await getAdminQuestionResources(
          mockRequest as AuthRequest,
          mockResponse,
        );

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({ error: 'id param required' });
      });

      it('trims whitespace from id parameter', async () => {
        mockRequest.params = { id: '  admin-test-id  ' };
        const mockPayload: ResourcesPayload = {
          starter_code: {},
          test_cases: [],
        };

        mockGetInternal.mockResolvedValue(mockPayload);

        await getAdminQuestionResources(
          mockRequest as AuthRequest,
          mockResponse,
        );

        expect(mockGetInternal).toHaveBeenCalledWith('admin-test-id');
      });
    });

    describe('successful responses', () => {
      it('returns resources including hidden test cases', async () => {
        mockRequest.params = { id: 'question-123' };
        const mockPayload: ResourcesPayload = {
          starter_code: { python: 'def solution():' },
          test_cases: [
            { input: '[1,2]', expected: '3', visibility: 'sample' },
            { input: '[5,10]', expected: '15', visibility: 'hidden' },
          ],
        };

        mockGetInternal.mockResolvedValue(mockPayload);

        await getAdminQuestionResources(
          mockRequest as AuthRequest,
          mockResponse,
        );

        expect(mockGetInternal).toHaveBeenCalledWith('question-123');
        expect(mockJson).toHaveBeenCalledWith(mockPayload);
        expect(log.info).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            totalCases: 2,
            sampleCount: 1,
            hiddenCount: 1,
          }),
        );
      });

      it('returns resources for draft questions', async () => {
        mockRequest.params = { id: 'draft-question' };
        mockGetInternal.mockResolvedValue({ starter_code: {}, test_cases: [] });

        await getAdminQuestionResources(
          mockRequest as AuthRequest,
          mockResponse,
        );

        expect(mockJson).toHaveBeenCalledWith({
          starter_code: {},
          test_cases: [],
        });
      });

      it('logs correct counts for test cases', async () => {
        mockRequest.params = { id: 'question-456' };
        const mockPayload: ResourcesPayload = {
          starter_code: { javascript: 'function test() {}' },
          test_cases: [
            { input: '1', expected: '2', visibility: 'sample' },
            { input: '2', expected: '3', visibility: 'sample' },
            { input: '3', expected: '4', visibility: 'hidden' },
            { input: '4', expected: '5', visibility: 'hidden' },
            { input: '5', expected: '6', visibility: 'hidden' },
          ],
        };

        mockGetInternal.mockResolvedValue(mockPayload);

        await getAdminQuestionResources(
          mockRequest as AuthRequest,
          mockResponse,
        );

        expect(log.info).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            totalCases: 5,
            sampleCount: 2,
            hiddenCount: 3,
          }),
        );
      });

      it('handles empty test_cases array', async () => {
        mockRequest.params = { id: 'question-empty' };
        mockGetInternal.mockResolvedValue({ starter_code: {}, test_cases: [] });

        await getAdminQuestionResources(
          mockRequest as AuthRequest,
          mockResponse,
        );

        expect(log.info).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            totalCases: 0,
            sampleCount: 0,
            hiddenCount: 0,
          }),
        );
      });
    });

    describe('not found scenarios', () => {
      it('returns 404 when question not found', async () => {
        mockRequest.params = { id: 'non-existent' };

        mockGetInternal.mockResolvedValue(null);

        await getAdminQuestionResources(
          mockRequest as AuthRequest,
          mockResponse,
        );

        expect(mockStatus).toHaveBeenCalledWith(404);
        expect(mockJson).toHaveBeenCalledWith({ error: 'not_found' });
        expect(log.warn).toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('returns 500 on repository error', async () => {
        mockRequest.params = { id: 'question-error' };

        mockGetInternal.mockRejectedValue(new Error('Database query failed'));

        await getAdminQuestionResources(
          mockRequest as AuthRequest,
          mockResponse,
        );

        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalledWith({ error: 'internal_error' });
        expect(log.error).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            error: 'Database query failed',
            stack: expect.any(String),
          }),
        );
      });

      it('handles non-Error exceptions', async () => {
        mockRequest.params = { id: 'question-weird' };

        mockGetInternal.mockRejectedValue({ code: 'UNKNOWN' });

        await getAdminQuestionResources(
          mockRequest as AuthRequest,
          mockResponse,
        );

        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalledWith({ error: 'internal_error' });
      });
    });
  });

  describe('Edge cases', () => {
    it('handles special characters in question id', async () => {
      mockRequest.params = { id: 'question-with-dashes_and_underscores' };
      const mockPayload: ResourcesPayload = {
        starter_code: {},
        test_cases: [],
      };

      mockGetPublic.mockResolvedValue(mockPayload);

      await getPublicQuestionResources(
        mockRequest as AuthRequest,
        mockResponse,
      );

      expect(mockGetPublic).toHaveBeenCalledWith(
        'question-with-dashes_and_underscores',
      );
      expect(mockJson).toHaveBeenCalledWith(mockPayload);
    });

    it('handles very long question ids', async () => {
      const longId = 'a'.repeat(200);
      mockRequest.params = { id: longId };
      const mockPayload: ResourcesPayload = {
        starter_code: {},
        test_cases: [],
      };

      mockGetPublic.mockResolvedValue(mockPayload);

      await getPublicQuestionResources(
        mockRequest as AuthRequest,
        mockResponse,
      );

      expect(mockGetPublic).toHaveBeenCalledWith(longId);
    });

    it('handles undefined params object', async () => {
      mockRequest.params = undefined as any;

      await getPublicQuestionResources(
        mockRequest as AuthRequest,
        mockResponse,
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'id param required' });
    });
  });
});
