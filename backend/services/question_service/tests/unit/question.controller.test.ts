import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { Request, Response } from 'express';

// 1) Install ESM-safe mocks *before* importing the modules under test.
await jest.unstable_mockModule('../../src/services/QuestionService.js', () => ({
  __esModule: true,
  getPublishedWithHtml: jest.fn(),
  listPublished: jest.fn(),
  getPublishedBatch: jest.fn(),
}));

await jest.unstable_mockModule(
  '../../src/repositories/QuestionRepository.js',
  () => ({
    __esModule: true,
    getPublicResourcesBundle: jest.fn(),
  }),
);

await jest.unstable_mockModule(
  '../../src/services/SelectionService.js',
  () => ({
    __esModule: true,
    selectOne: jest.fn(),
  }),
);

await jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  __esModule: true,
  log: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// 2) Now dynamically import the mocked modules and the controller.
const Service = await import('../../src/services/QuestionService.js');
const Repo = await import('../../src/repositories/QuestionRepository.js');
const Sel = await import('../../src/services/SelectionService.js');
const QuestionController = await import(
  '../../src/controllers/QuestionController.js'
);

// 3) (Optional) typed handles so TS knows these are Jest mocks.
const mockService = Service as unknown as {
  getPublishedWithHtml: jest.Mock;
  listPublished: jest.Mock;
  getPublishedBatch: jest.Mock;
};
const mockRepo = Repo as unknown as {
  getPublicResourcesBundle: jest.Mock;
};
const selectOne = Sel.selectOne as unknown as jest.Mock;

describe('QuestionController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.resetAllMocks();

    // Setup response mock
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnThis();

    mockResponse = {
      json: jsonMock,
      status: statusMock,
    };

    // Setup request mock
    mockRequest = {
      params: {},
      query: {},
      body: {},
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
      user: {
        role: 'user',
        sub: 'user-123',
        userId: 'user-123',
      },
    };
  });

  describe('getById', () => {
    it('should return 400 when id param is missing', async () => {
      mockRequest.params = {};

      await QuestionController.getById(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'id param required' });
    });

    it('should return 404 when question is not found', async () => {
      mockRequest.params = { id: 'non-existent-id' };
      mockService.getPublishedWithHtml.mockResolvedValue(null);

      await QuestionController.getById(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'not found' });
    });

    it('should return question with starter code and test cases', async () => {
      const mockQuestion = {
        id: 'two-sum',
        title: 'Two Sum',
        body_md: '# Problem',
        body_html: '<h1>Problem</h1>',
        difficulty: 'Easy',
        topics: [{ slug: 'arrays', color_hex: '#ff0000' }],
        attachments: [],
        status: 'published',
        version: 1,
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
      };

      const mockBundle = {
        starter_code: { python: 'def solution():' },
        test_cases: [
          {
            name: 'Test 1',
            visibility: 'sample',
            input: '[1,2]',
            expected: '[3]',
            ordinal: 1,
          },
        ],
      };

      mockRequest.params = { id: 'two-sum' };
      mockService.getPublishedWithHtml.mockResolvedValue(mockQuestion);
      mockRepo.getPublicResourcesBundle.mockResolvedValue(mockBundle);

      await QuestionController.getById(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(jsonMock).toHaveBeenCalledWith({
        ...mockQuestion,
        starter_code: mockBundle.starter_code,
        test_cases: mockBundle.test_cases,
      });
    });

    it('should handle missing bundle gracefully', async () => {
      const mockQuestion = {
        id: 'two-sum',
        title: 'Two Sum',
        difficulty: 'Easy',
        topics: [],
        attachments: [],
      };

      mockRequest.params = { id: 'two-sum' };
      mockService.getPublishedWithHtml.mockResolvedValue(mockQuestion);
      mockRepo.getPublicResourcesBundle.mockResolvedValue(null);

      await QuestionController.getById(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(jsonMock).toHaveBeenCalledWith({
        ...mockQuestion,
        starter_code: {},
        test_cases: [],
      });
    });

    it('should return 500 on service error', async () => {
      mockRequest.params = { id: 'two-sum' };
      mockService.getPublishedWithHtml.mockRejectedValue(
        new Error('Database error'),
      );

      await QuestionController.getById(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'internal_error' });
    });
  });

  describe('list', () => {
    it('should return paginated list of questions', async () => {
      const mockResult = {
        items: [
          { id: 'q1', title: 'Question 1', difficulty: 'Easy' },
          { id: 'q2', title: 'Question 2', difficulty: 'Medium' },
        ],
        total: 2,
      };

      mockService.listPublished.mockResolvedValue(mockResult);

      await QuestionController.list(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(jsonMock).toHaveBeenCalledWith({
        items: mockResult.items,
        total: 2,
        page: 1,
        page_size: 20,
      });
    });

    it('should filter by difficulty', async () => {
      mockRequest.query = { difficulty: 'medium' };

      const mockResult = {
        items: [{ id: 'q1', title: 'Question 1', difficulty: 'Medium' }],
        total: 1,
      };

      mockService.listPublished.mockResolvedValue(mockResult);

      await QuestionController.list(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockService.listPublished).toHaveBeenCalledWith({
        difficulty: 'Medium',
      });
    });

    it('should filter by topics (string format)', async () => {
      mockRequest.query = { topics: 'arrays,strings' };

      const mockResult = { items: [], total: 0 };
      mockService.listPublished.mockResolvedValue(mockResult);

      await QuestionController.list(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockService.listPublished).toHaveBeenCalledWith({
        topics: ['arrays', 'strings'],
      });
    });

    it('should filter by topics (array format)', async () => {
      mockRequest.query = { topics: ['arrays', 'strings'] };

      const mockResult = { items: [], total: 0 };
      mockService.listPublished.mockResolvedValue(mockResult);

      await QuestionController.list(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockService.listPublished).toHaveBeenCalledWith({
        topics: ['arrays', 'strings'],
      });
    });

    it('should handle search query', async () => {
      mockRequest.query = { q: 'two sum' };

      const mockResult = { items: [], total: 0 };
      mockService.listPublished.mockResolvedValue(mockResult);

      await QuestionController.list(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockService.listPublished).toHaveBeenCalledWith({
        q: 'two sum',
      });
    });

    it('should handle pagination parameters', async () => {
      mockRequest.query = { page: '2', page_size: '10' };

      const mockResult = { items: [], total: 0 };
      mockService.listPublished.mockResolvedValue(mockResult);

      await QuestionController.list(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockService.listPublished).toHaveBeenCalledWith({
        page: 2,
        page_size: 10,
      });
      expect(jsonMock).toHaveBeenCalledWith({
        items: [],
        total: 0,
        page: 2,
        page_size: 10,
      });
    });

    it('should normalize difficulty case-insensitively', async () => {
      mockRequest.query = { difficulty: 'EASY' };

      const mockResult = { items: [], total: 0 };
      mockService.listPublished.mockResolvedValue(mockResult);

      await QuestionController.list(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockService.listPublished).toHaveBeenCalledWith({
        difficulty: 'Easy',
      });
    });

    it('should ignore invalid difficulty values', async () => {
      mockRequest.query = { difficulty: 'invalid' };

      const mockResult = { items: [], total: 0 };
      mockService.listPublished.mockResolvedValue(mockResult);

      await QuestionController.list(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockService.listPublished).toHaveBeenCalledWith({});
    });

    it('should return 500 on service error', async () => {
      mockService.listPublished.mockRejectedValue(new Error('Database error'));

      await QuestionController.list(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'internal_error' }),
      );
    });
  });

  describe('select', () => {
    it('should return 400 when matching_id is missing', async () => {
      mockRequest.body = {};

      await QuestionController.select(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'matching_id required',
      });
    });

    it('should select a question successfully', async () => {
      mockRequest.body = {
        matching_id: 'sess-123',
        difficulty: 'medium',
        topics: ['arrays'],
        recent_ids: ['two-sum'],
      };

      const mockResult = {
        question_id: 'three-sum',
        matching_id: 'sess-123',
      };

      selectOne.mockResolvedValue(mockResult);

      await QuestionController.select(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(selectOne).toHaveBeenCalledWith({
        matching_id: 'sess-123',
        difficulty: 'medium',
        topics: ['arrays'],
        recent_ids: ['two-sum'],
      });
      expect(jsonMock).toHaveBeenCalledWith(mockResult);
    });

    it('should return 404 when no eligible question found', async () => {
      mockRequest.body = {
        matching_id: 'sess-123',
      };

      const mockResult = {
        question_id: null,
        matching_id: 'sess-123',
      };

      selectOne.mockResolvedValue(mockResult);

      await QuestionController.select(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'no eligible question',
      });
    });

    it('should return 500 on selection error', async () => {
      mockRequest.body = {
        matching_id: 'sess-123',
      };

      selectOne.mockRejectedValue(new Error('Selection failed'));

      await QuestionController.select(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'internal_error' });
    });
  });

  describe('getBatchById', () => {
    it('should return 400 when ids param is missing', async () => {
      mockRequest.query = {};

      await QuestionController.getBatchById(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'missing_ids',
        message: 'query param ?ids=... is required',
      });
    });

    it('should return 400 when ids param is empty', async () => {
      mockRequest.query = { ids: '   ' };

      await QuestionController.getBatchById(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'missing_ids',
        message: 'query param ?ids=... is required',
      });
    });

    it('should return 400 when no valid ids found', async () => {
      mockRequest.query = { ids: ',,,' };

      await QuestionController.getBatchById(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'no_valid_ids',
        message: 'no usable ids found',
      });
    });

    it('should return 400 when too many ids provided', async () => {
      const ids = Array.from({ length: 51 }, (_, i) => `q${i}`).join(',');
      mockRequest.query = { ids };

      await QuestionController.getBatchById(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'too_many_ids',
        message: 'limit 50 ids per request',
      });
    });

    it('should fetch batch of questions successfully', async () => {
      mockRequest.query = { ids: 'q1,q2,q3' };

      const mockQuestions = [
        { id: 'q1', title: 'Question 1' },
        { id: 'q2', title: 'Question 2' },
        { id: 'q3', title: 'Question 3' },
      ];

      mockService.getPublishedBatch.mockResolvedValue(mockQuestions);

      await QuestionController.getBatchById(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockService.getPublishedBatch).toHaveBeenCalledWith([
        'q1',
        'q2',
        'q3',
      ]);
      expect(jsonMock).toHaveBeenCalledWith({
        items: mockQuestions,
        count: 3,
      });
    });

    it('should deduplicate ids', async () => {
      mockRequest.query = { ids: 'q1,q2,q1,q3,q2' };

      mockService.getPublishedBatch.mockResolvedValue([]);

      await QuestionController.getBatchById(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockService.getPublishedBatch).toHaveBeenCalledWith([
        'q1',
        'q2',
        'q3',
      ]);
    });

    it('should trim whitespace from ids', async () => {
      mockRequest.query = { ids: ' q1 , q2 , q3 ' };

      mockService.getPublishedBatch.mockResolvedValue([]);

      await QuestionController.getBatchById(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockService.getPublishedBatch).toHaveBeenCalledWith([
        'q1',
        'q2',
        'q3',
      ]);
    });

    it('should return 500 on service error', async () => {
      mockRequest.query = { ids: 'q1,q2' };

      mockService.getPublishedBatch.mockRejectedValue(
        new Error('Database error'),
      );

      await QuestionController.getBatchById(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'internal_error' });
    });
  });
});
