import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { Request, Response } from 'express';

// ---- Local mock functions/objects we control ----
const list = jest.fn();
const listPublished = jest.fn();
const create = jest.fn();

const slugify = jest.fn();

const log = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

await jest.unstable_mockModule(
  '../../src/repositories/TopicRepository.js',
  () => ({
    list,
    listPublished,
    create,
  }),
);

await jest.unstable_mockModule('../../src/utils/slug.js', () => ({
  slugify,
}));

await jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  log,
}));

// ---- Now import the controller (SUT) ----
const TopicController = await import(
  '../../src/controllers/TopicController.js'
);

describe('TopicController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let locationMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnThis();
    locationMock = jest.fn().mockReturnThis();

    mockResponse = {
      json: jsonMock,
      status: statusMock,
      location: locationMock,
    };

    mockRequest = {
      query: {},
      body: {},
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
      // @ts-expect-error add user for tests
      user: { role: 'admin', sub: 'user-123', userId: 'user-123' },
    };
  });

  describe('list', () => {
    it('should return list of topics successfully', async () => {
      const mockTopics = [
        { slug: 'arrays', display: 'Arrays', color_hex: '#ff0000' },
        { slug: 'strings', display: 'Strings', color_hex: '#00ff00' },
      ];
      list.mockResolvedValue(mockTopics);

      await TopicController.list(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(list).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith({ items: mockTopics });
      expect(log.info).toHaveBeenCalledWith(
        '[GET /topics] success',
        expect.objectContaining({ count: 2 }),
      );
    });

    it('should return empty array when no topics exist', async () => {
      list.mockResolvedValue([]);

      await TopicController.list(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(jsonMock).toHaveBeenCalledWith({ items: [] });
      expect(log.info).toHaveBeenCalledWith(
        '[GET /topics] success',
        expect.objectContaining({ count: 0 }),
      );
    });

    it('should return 500 on repository error', async () => {
      list.mockRejectedValue(new Error('Database error'));

      await TopicController.list(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'internal_error' });
      expect(log.error).toHaveBeenCalledWith(
        '[GET /topics] error',
        expect.objectContaining({
          error: 'Database error',
          stack: expect.any(String),
        }),
      );
    });

    it('should log request metadata', async () => {
      list.mockResolvedValue([]);

      await TopicController.list(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(log.info).toHaveBeenCalledWith(
        '[GET /topics] request',
        expect.objectContaining({
          ip: '127.0.0.1',
          ua: 'test-user-agent',
          userRole: 'admin',
          userId: 'user-123',
        }),
      );
    });
  });

  describe('listPublished', () => {
    describe('successful requests', () => {
      it('should return published topics for Easy difficulty', async () => {
        mockRequest.query = { difficulty: 'easy' };
        const mockTopics = [
          { slug: 'arrays', display: 'Arrays', count: 10 },
          { slug: 'strings', display: 'Strings', count: 5 },
        ];
        listPublished.mockResolvedValue(mockTopics);

        await TopicController.listPublished(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(listPublished).toHaveBeenCalledWith('Easy');
        expect(jsonMock).toHaveBeenCalledWith({ items: mockTopics });
      });

      it('should return published topics for Medium difficulty', async () => {
        mockRequest.query = { difficulty: 'medium' };
        listPublished.mockResolvedValue([
          { slug: 'graphs', display: 'Graphs', count: 3 },
        ]);

        await TopicController.listPublished(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(listPublished).toHaveBeenCalledWith('Medium');
        expect(jsonMock).toHaveBeenCalledWith({
          items: [{ slug: 'graphs', display: 'Graphs', count: 3 }],
        });
      });

      it('should return published topics for Hard difficulty', async () => {
        mockRequest.query = { difficulty: 'hard' };
        const mockTopics = [
          {
            slug: 'dynamic-programming',
            display: 'Dynamic Programming',
            count: 15,
          },
        ];
        listPublished.mockResolvedValue(mockTopics);

        await TopicController.listPublished(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(listPublished).toHaveBeenCalledWith('Hard');
        expect(jsonMock).toHaveBeenCalledWith({ items: mockTopics });
      });

      it('should normalize difficulty case-insensitively', async () => {
        mockRequest.query = { difficulty: 'EASY' };
        listPublished.mockResolvedValue([]);

        await TopicController.listPublished(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(listPublished).toHaveBeenCalledWith('Easy');
      });

      it('should log first topic slug for debugging', async () => {
        mockRequest.query = { difficulty: 'easy' };
        const mockTopics = [{ slug: 'arrays', display: 'Arrays', count: 10 }];
        listPublished.mockResolvedValue(mockTopics);

        await TopicController.listPublished(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(log.info).toHaveBeenCalledWith(
          '[GET /questions/topics] success',
          expect.objectContaining({
            difficulty: 'Easy',
            count: 1,
            first_slug: 'arrays',
          }),
        );
      });
    });

    describe('validation errors', () => {
      it('should return 400 when difficulty is missing', async () => {
        mockRequest.query = {};

        await TopicController.listPublished(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'invalid_or_missing_difficulty',
        });
        expect(listPublished).not.toHaveBeenCalled();
      });

      it('should return 400 when difficulty is invalid', async () => {
        mockRequest.query = { difficulty: 'invalid' };

        await TopicController.listPublished(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'invalid_or_missing_difficulty',
        });
        expect(log.warn).toHaveBeenCalledWith(
          '[GET /questions/topics] invalid_or_missing_difficulty',
          expect.objectContaining({ difficulty: 'invalid' }),
        );
      });

      it('should return 400 when difficulty is empty string', async () => {
        mockRequest.query = { difficulty: '' };

        await TopicController.listPublished(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'invalid_or_missing_difficulty',
        });
      });
    });

    describe('error handling', () => {
      it('should return 500 on repository error', async () => {
        mockRequest.query = { difficulty: 'easy' };
        listPublished.mockRejectedValue(new Error('Database error'));

        await TopicController.listPublished(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'internal_error' });
        expect(log.error).toHaveBeenCalledWith(
          '[GET /questions/topics] error',
          expect.objectContaining({
            difficulty: 'Easy',
            error: 'Database error',
          }),
        );
      });
    });
  });

  describe('create', () => {
    describe('successful creation', () => {
      beforeEach(() => {
        slugify.mockReturnValue('dynamic-programming');
      });

      it('should create topic with valid hex color', async () => {
        mockRequest.body = {
          display: 'Dynamic Programming',
          color_hex: '#2A9D8F',
        };

        const mockCreated = {
          slug: 'dynamic-programming',
          display: 'Dynamic Programming',
          color_hex: '#2a9d8f',
        };
        create.mockResolvedValue(mockCreated);

        await TopicController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(slugify).toHaveBeenCalledWith('Dynamic Programming');
        expect(create).toHaveBeenCalledWith(
          'dynamic-programming',
          'Dynamic Programming',
          '#2a9d8f',
        );
        expect(statusMock).toHaveBeenCalledWith(201);
        expect(locationMock).toHaveBeenCalledWith(
          '/admin/topics/dynamic-programming',
        );
        expect(jsonMock).toHaveBeenCalledWith(mockCreated);
      });

      it('should normalize hex color to lowercase', async () => {
        mockRequest.body = { display: 'Arrays', color_hex: '#FF0000' };
        slugify.mockReturnValue('arrays');
        create.mockResolvedValue({
          slug: 'arrays',
          display: 'Arrays',
          color_hex: '#ff0000',
        });

        await TopicController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(create).toHaveBeenCalledWith('arrays', 'Arrays', '#ff0000');
      });

      it('should accept 3-character hex color', async () => {
        mockRequest.body = { display: 'Graphs', color_hex: '#F0F' };
        slugify.mockReturnValue('graphs');
        create.mockResolvedValue({
          slug: 'graphs',
          display: 'Graphs',
          color_hex: '#f0f',
        });

        await TopicController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(create).toHaveBeenCalledWith('graphs', 'Graphs', '#f0f');
      });

      it('should default to black for invalid hex color', async () => {
        mockRequest.body = { display: 'Trees', color_hex: 'not-a-hex' };
        slugify.mockReturnValue('trees');
        create.mockResolvedValue({
          slug: 'trees',
          display: 'Trees',
          color_hex: '#000000ff',
        });

        await TopicController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(create).toHaveBeenCalledWith('trees', 'Trees', '#000000ff');
      });

      it('should trim whitespace from display name', async () => {
        mockRequest.body = {
          display: '  Binary Search  ',
          color_hex: '#123456',
        };
        slugify.mockReturnValue('binary-search');
        create.mockResolvedValue({
          slug: 'binary-search',
          display: 'Binary Search',
          color_hex: '#123456',
        });

        await TopicController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(slugify).toHaveBeenCalledWith('Binary Search');
      });

      it('should log successful creation', async () => {
        mockRequest.body = { display: 'Heaps', color_hex: '#ABCDEF' };
        slugify.mockReturnValue('heaps');
        create.mockResolvedValue({
          slug: 'heaps',
          display: 'Heaps',
          color_hex: '#abcdef',
        });

        await TopicController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(log.info).toHaveBeenCalledWith(
          '[POST /admin/topics] success',
          expect.objectContaining({
            role: 'admin',
            userId: 'user-123',
            slug: 'heaps',
            display: 'Heaps',
            color_hex: '#abcdef',
          }),
        );
      });
    });

    describe('validation errors', () => {
      it('should return 400 when display is missing', async () => {
        mockRequest.body = { color_hex: '#FF0000' };

        await TopicController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'display is required' });
        expect(create).not.toHaveBeenCalled();
      });

      it('should return 400 when display is empty string', async () => {
        mockRequest.body = { display: '', color_hex: '#FF0000' };

        await TopicController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'display is required' });
      });

      it('should return 400 when display is only whitespace', async () => {
        mockRequest.body = { display: '   ', color_hex: '#FF0000' };

        await TopicController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'display is required' });
      });

      it('should return 400 when display is not a string', async () => {
        // @ts-expect-error: testing bad type
        mockRequest.body = { display: 123, color_hex: '#FF0000' };

        await TopicController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'display is required' });
      });

      it('should return 400 when color_hex is missing', async () => {
        mockRequest.body = { display: 'Arrays' };

        await TopicController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'color_hex is required',
        });
        expect(create).not.toHaveBeenCalled();
      });

      it('should return 400 when color_hex is empty string', async () => {
        mockRequest.body = { display: 'Arrays', color_hex: '' };

        await TopicController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'color_hex is required',
        });
      });

      it('should return 400 when color_hex is only whitespace', async () => {
        mockRequest.body = { display: 'Arrays', color_hex: '   ' };

        await TopicController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'color_hex is required',
        });
      });

      it('should return 400 when color_hex is not a string', async () => {
        // @ts-expect-error: testing bad type
        mockRequest.body = { display: 'Arrays', color_hex: 123456 };

        await TopicController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'color_hex is required',
        });
      });

      it('should return 400 when slugify returns empty string', async () => {
        mockRequest.body = { display: '!!!', color_hex: '#FF0000' };
        slugify.mockReturnValue('');

        await TopicController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'invalid display name (cannot derive a slug)',
        });
        expect(create).not.toHaveBeenCalled();
      });

      it('should return 400 when slugify returns null', async () => {
        mockRequest.body = { display: '@@@', color_hex: '#FF0000' };
        slugify.mockReturnValue(null);

        await TopicController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'invalid display name (cannot derive a slug)',
        });
      });
    });

    describe('error handling', () => {
      it('should return 500 on repository error', async () => {
        mockRequest.body = { display: 'Arrays', color_hex: '#FF0000' };
        slugify.mockReturnValue('arrays');
        create.mockRejectedValue(new Error('Duplicate slug'));

        await TopicController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'internal_error' });
        expect(log.error).toHaveBeenCalledWith(
          '[POST /admin/topics] error',
          expect.objectContaining({
            error: 'Duplicate slug',
            stack: expect.any(String),
          }),
        );
      });

      it('should handle non-Error exceptions', async () => {
        mockRequest.body = { display: 'Arrays', color_hex: '#FF0000' };
        slugify.mockReturnValue('arrays');
        create.mockRejectedValue('string error');

        await TopicController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'internal_error' });
      });
    });

    describe('user context', () => {
      it('should handle anonymous users', async () => {
        // @ts-expect-error anonymize
        mockRequest.user = undefined;
        mockRequest.body = { display: 'Arrays', color_hex: '#FF0000' };
        slugify.mockReturnValue('arrays');
        create.mockResolvedValue({
          slug: 'arrays',
          display: 'Arrays',
          color_hex: '#ff0000',
        });

        await TopicController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(log.info).toHaveBeenCalledWith(
          '[POST /admin/topics] request',
          expect.objectContaining({ role: 'anonymous' }),
        );
      });

      it('should log request body types for debugging', async () => {
        mockRequest.body = { display: 'Arrays', color_hex: '#FF0000' };
        slugify.mockReturnValue('arrays');
        create.mockResolvedValue({
          slug: 'arrays',
          display: 'Arrays',
          color_hex: '#ff0000',
        });

        await TopicController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(log.info).toHaveBeenCalledWith(
          '[POST /admin/topics] request',
          expect.objectContaining({
            body_preview: { display_type: 'string', color_hex_type: 'string' },
          }),
        );
      });
    });
  });
});
