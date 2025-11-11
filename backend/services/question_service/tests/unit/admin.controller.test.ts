import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  beforeAll,
} from '@jest/globals';
import type { Request, Response } from 'express';
import { asMock } from '../helpers/asMock.js';

type TestCase = {
  name: string;
  visibility: string;
  input_data: string;
  expected_output: string;
  ordinal: number;
};

type Bundle = {
  question_id: string;
  status: string;
  starter_code: string | undefined;
  entry_point: string | undefined; // <-- new
  test_cases: TestCase[];
  updated_at: string;
};

function makeBundle(overrides: Partial<Bundle> = {}): Bundle {
  return {
    question_id: 'test-question',
    status: 'draft',
    starter_code: '',
    entry_point: 'main',
    test_cases: [],
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

let AdminController: typeof import('../../src/controllers/AdminController.js');
let Repo: typeof import('../../src/repositories/QuestionRepository.js');
let AttachmentService: typeof import('../../src/services/AttachmentService.js');
let logger: typeof import('../../src/utils/logger.js');
let slugUtils: typeof import('../../src/utils/slug.js');
let Service: typeof import('../../src/services/QuestionService.js');

// prisma alias will be assigned after dynamic import inside beforeAll
let prisma: any;
const setTopics = (rows: any[]) =>
  (prisma.topics.findMany as unknown as jest.Mock<any>).mockResolvedValue(
    rows as any,
  );

// typed Express Response stub to avoid TS2322 on Send<...>
function mockRes(): Response {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    location: jest.fn().mockReturnThis(),
    get: jest.fn(),
    setHeader: jest.fn(),
  };
  return res as unknown as Response;
}

/** ---------- Small factories to keep mocks consistent ---------- */
function dbRow(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 'test',
    title: 'Test',
    body_md: 'Body',
    difficulty: 'Easy' as const,
    status: 'draft' as const,
    topics: [] as string[],
    attachments: [] as any[],
    version: 1,
    rand_key: 0.123,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

function publicView(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 'test',
    title: 'Test',
    body_md: 'Body',
    body_html: '<p>Body</p>',
    difficulty: 'Easy' as const,
    status: 'draft' as const,
    topics: [] as Array<{ slug: string; display: string; color_hex: string }>,
    attachments: [] as any[],
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function bundle(overrides: Partial<Record<string, any>> = {}) {
  return {
    question_id: 'test',
    status: 'draft',
    starter_code: '', // string (not a language map)
    test_cases: [] as Array<{
      name: string;
      visibility: string;
      input_data: string;
      expected_output: string;
      ordinal: number;
    }>,
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}
/** ---------------------------------------------------------------- */

beforeAll(async () => {
  await jest.unstable_mockModule('../../src/utils/slug.js', () => ({
    __esModule: true,
    slugify: jest.fn(),
  }));

  await jest.unstable_mockModule('../../src/utils/logger.js', () => ({
    __esModule: true,
    log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  }));

  await jest.unstable_mockModule(
    '../../src/services/AttachmentService.js',
    () => ({
      __esModule: true,
      finalizeStagedAttachments: jest.fn(),
      signViewUrl: jest.fn(),
      signUploadUrl: jest.fn(),
      buildObjectKey: jest.fn(),
    }),
  );

  await jest.unstable_mockModule(
    '../../src/repositories/QuestionRepository.js',
    () => ({
      __esModule: true,
      createDraft: jest.fn(),
      updateWithResources: jest.fn(),
      getInternalResourcesBundle: jest.fn(),
      getQuestionById: jest.fn(),
      listAll: jest.fn(),
      publish: jest.fn(),
      archive: jest.fn(),
    }),
  );

  // Mock the Service layer so getById uses getQuestionWithHtml
  await jest.unstable_mockModule(
    '../../src/services/QuestionService.js',
    () => ({
      __esModule: true,
      getQuestionWithHtml: jest.fn(),
      listAll: jest.fn(),
    }),
  );

  // IMPORTANT: mock prisma BEFORE importing code that uses it
  await jest.unstable_mockModule('../../src/repositories/prisma.js', () => ({
    __esModule: true,
    prisma: { topics: { findMany: jest.fn() } },
  }));

  // Import AFTER mocks are registered
  AdminController = await import('../../src/controllers/AdminController.js');
  Repo = await import('../../src/repositories/QuestionRepository.js');
  AttachmentService = await import('../../src/services/AttachmentService.js');
  logger = await import('../../src/utils/logger.js');
  slugUtils = await import('../../src/utils/slug.js');
  Service = await import('../../src/services/QuestionService.js');

  // Get the mocked prisma AFTER import
  ({ prisma } = (await import('../../src/repositories/prisma.js')) as any);
});

describe('AdminController - Unit Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockLocation: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    const res = mockRes();
    mockResponse = res;

    mockJson = res.json as unknown as jest.Mock;
    mockStatus = res.status as unknown as jest.Mock;
    mockLocation = res.location as unknown as jest.Mock;

    mockRequest = {
      params: {},
      body: {},
      query: {},
      get: jest.fn().mockReturnValue(undefined) as unknown as Request['get'],
    } as Partial<Request>;
  });

  describe('create', () => {
    describe('validation', () => {
      it('should return 400 when title is missing', async () => {
        mockRequest.body = {
          body_md: 'Test body',
          difficulty: 'Easy',
        };

        await AdminController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({ error: 'title is required' });
      });

      it('should return 400 when title is empty string', async () => {
        mockRequest.body = {
          title: '   ',
          body_md: 'Test body',
          difficulty: 'Easy',
        };

        await AdminController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({ error: 'title is required' });
      });

      it('should return 400 when body_md is missing', async () => {
        mockRequest.body = {
          title: 'Test Question',
          difficulty: 'Easy',
        };

        await AdminController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({ error: 'body_md is required' });
      });

      it('should return 400 when body_md is empty string', async () => {
        mockRequest.body = {
          title: 'Test Question',
          body_md: '   ',
          difficulty: 'Easy',
        };

        await AdminController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({ error: 'body_md is required' });
      });

      it('should return 400 when difficulty is invalid', async () => {
        mockRequest.body = {
          title: 'Test Question',
          body_md: 'Test body',
          difficulty: 'Super Hard',
        };

        await AdminController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          error: 'difficulty must be: Easy, Medium, Hard',
        });
      });

      it('should normalize difficulty case-insensitively', async () => {
        mockRequest.body = {
          title: 'Test Question',
          body_md: 'Test body',
          difficulty: 'easy',
        };

        asMock(slugUtils.slugify).mockReturnValue('test-question');
        setTopics([]);
        asMock(Repo.createDraft).mockResolvedValue(
          dbRow({
            id: 'test-question',
            title: 'Test Question',
            body_md: 'Test body',
            difficulty: 'Easy',
          }),
        );
        asMock(Repo.updateWithResources).mockResolvedValue(
          dbRow({
            id: 'test-question',
            title: 'Test Question',
            body_md: 'Test body',
            difficulty: 'Easy',
          }),
        );
        asMock(Repo.getInternalResourcesBundle).mockResolvedValue(
          makeBundle({ question_id: 'test' }),
        );

        await AdminController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(Repo.createDraft).toHaveBeenCalledWith(
          expect.objectContaining({
            difficulty: 'Easy',
          }),
        );
      });

      it('should return 400 when topics do not exist', async () => {
        mockRequest.body = {
          title: 'Test Question',
          body_md: 'Test body',
          difficulty: 'Easy',
          topics: ['arrays', 'non-existent-topic'],
        };

        setTopics([{ slug: 'arrays' }]);

        await AdminController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          error: 'topics_not_found',
          missing: ['non-existent-topic'],
          message: expect.any(String),
        });
      });

      it('should return 400 when slug cannot be derived from title', async () => {
        mockRequest.body = {
          title: 'Test Question',
          body_md: 'Test body',
          difficulty: 'Easy',
        };

        asMock(slugUtils.slugify).mockReturnValue('');
        setTopics([]);

        await AdminController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          error: 'invalid title (cannot derive a slug)',
        });
      });
    });

    describe('successful creation', () => {
      beforeEach(() => {
        asMock(slugUtils.slugify).mockReturnValue('test-question');
        setTopics([]);
      });

      it('should create a basic question without optional fields', async () => {
        mockRequest.body = {
          title: 'Test Question',
          body_md: 'Test body',
          difficulty: 'Easy',
        };

        const mockDraft = dbRow({
          id: 'test-question',
          title: 'Test Question',
          body_md: 'Test body',
          difficulty: 'Easy' as const,
          status: 'draft' as const,
        });

        asMock(Repo.createDraft).mockResolvedValue(mockDraft);
        asMock(Repo.updateWithResources).mockResolvedValue(mockDraft);
        asMock(Repo.getInternalResourcesBundle).mockResolvedValue(
          bundle({
            question_id: 'test-question',
            starter_code: '',
            test_cases: [],
          }),
        );
        asMock(AttachmentService.signViewUrl).mockResolvedValue({
          object_key: 'dummy/key.png',
          view_url: 'https://example.com/signed-url',
          expires_at: new Date(Date.now() + 900_000).toISOString(),
        });

        await AdminController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(mockStatus).toHaveBeenCalledWith(201);
        expect(mockLocation).toHaveBeenCalledWith(
          '/admin/questions/test-question',
        );
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'test-question',
            title: 'Test Question',
            starter_code: '',
            test_cases: [],
          }),
        );
      });

      it('should create question with topics', async () => {
        mockRequest.body = {
          title: 'Test Question',
          body_md: 'Test body',
          difficulty: 'Medium',
          topics: ['arrays', 'hash-table'],
        };

        setTopics([{ slug: 'arrays' }, { slug: 'hash-table' }]);

        const mockDraft = dbRow({
          id: 'test-question',
          title: 'Test Question',
          body_md: 'Test body',
          difficulty: 'Medium' as const,
          status: 'draft' as const,
          topics: ['arrays', 'hash-table'],
        });

        asMock(Repo.createDraft).mockResolvedValue(mockDraft);
        asMock(Repo.updateWithResources).mockResolvedValue(mockDraft);
        asMock(Repo.getInternalResourcesBundle).mockResolvedValue(
          bundle({
            question_id: 'test-question',
            starter_code: '',
            test_cases: [],
          }),
        );
        asMock(AttachmentService.signViewUrl).mockResolvedValue({
          object_key: 'dummy/key.png',
          view_url: 'https://example.com/signed-url',
          expires_at: new Date(Date.now() + 900_000).toISOString(),
        });

        await AdminController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(Repo.createDraft).toHaveBeenCalledWith(
          expect.objectContaining({
            topics: ['arrays', 'hash-table'],
          }),
        );
        expect(mockStatus).toHaveBeenCalledWith(201);
      });

      it('should create question with starter code and test cases', async () => {
        mockRequest.body = {
          title: 'Test Question',
          body_md: 'Test body',
          difficulty: 'Hard',
          starter_code: 'def solution():\n    pass',
          test_cases: [
            {
              visibility: 'sample',
              input_data: '[1,2,3]',
              expected_output: '6',
              ordinal: 1,
            },
            {
              visibility: 'hidden',
              input_data: '[4,5,6]',
              expected_output: '15',
              ordinal: 2,
            },
          ],
        };

        const mockDraft = dbRow({
          id: 'test-question',
          title: 'Test Question',
          body_md: 'Test body',
          difficulty: 'Hard' as const,
          status: 'draft' as const,
        });

        asMock(Repo.createDraft).mockResolvedValue(mockDraft);
        asMock(Repo.updateWithResources).mockResolvedValue(mockDraft);
        asMock(Repo.getInternalResourcesBundle).mockResolvedValue(
          bundle({
            question_id: 'test-question',
            starter_code: 'def solution():\n    pass',
            test_cases: mockRequest.body.test_cases.map(
              (tc: any, i: number) => ({
                name: `tc-${i + 1}`,
                visibility: tc.visibility,
                input_data: tc.input_data,
                expected_output: tc.expected_output,
                ordinal: tc.ordinal ?? i + 1,
              }),
            ),
          }),
        );
        asMock(AttachmentService.signViewUrl).mockResolvedValue({
          object_key: 'dummy/key.png',
          view_url: 'https://example.com/signed-url',
          expires_at: new Date(Date.now() + 900_000).toISOString(),
        });

        await AdminController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(Repo.updateWithResources).toHaveBeenCalledWith(
          'test-question',
          expect.objectContaining({
            starter_code: 'def solution():\n    pass',
            test_cases: mockRequest.body.test_cases,
          }),
        );
        expect(mockStatus).toHaveBeenCalledWith(201);
      });

      it('should finalize staged attachments and rewrite markdown', async () => {
        mockRequest.body = {
          title: 'Test Question',
          body_md: 'Image: ![test](pp://staging/abc123.png)',
          difficulty: 'Easy',
          attachments: [
            {
              object_key: 'staging/abc123.png',
              filename: 'test.png',
              mime: 'image/png',
            },
          ],
        };

        const mockDraft = dbRow({
          id: 'test-question',
          title: 'Test Question',
          body_md: 'Image: ![test](pp://staging/abc123.png)',
          difficulty: 'Easy' as const,
          status: 'draft' as const,
        });

        const finalizedAtts = [
          {
            object_key: 'questions/test-question/abc123.png',
            filename: 'test.png',
            mime: 'image/png',
          },
        ];

        asMock(Repo.createDraft).mockResolvedValue(mockDraft);
        asMock(AttachmentService.finalizeStagedAttachments).mockResolvedValue(
          finalizedAtts,
        );
        asMock(Repo.updateWithResources).mockResolvedValue(
          dbRow({
            ...mockDraft,
            attachments: finalizedAtts,
            body_md: 'Image: ![test](pp://questions/test-question/abc123.png)',
          }),
        );
        asMock(Repo.getInternalResourcesBundle).mockResolvedValue(
          bundle({
            question_id: 'test-question',
            starter_code: '',
            test_cases: [],
          }),
        );
        asMock(AttachmentService.signViewUrl).mockResolvedValue({
          object_key: 'dummy/key.png',
          view_url: 'https://example.com/signed-url',
          expires_at: new Date(Date.now() + 900_000).toISOString(),
        });

        await AdminController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(
          AttachmentService.finalizeStagedAttachments,
        ).toHaveBeenCalledWith('test-question', mockRequest.body.attachments);
        expect(Repo.updateWithResources).toHaveBeenCalledWith(
          'test-question',
          expect.objectContaining({
            body_md: 'Image: ![test](pp://questions/test-question/abc123.png)',
            attachments: finalizedAtts,
          }),
        );
      });
    });

    describe('error handling', () => {
      beforeEach(() => {
        asMock(slugUtils.slugify).mockReturnValue('test-question');
        setTopics([]);
      });

      it('should return 500 when updateWithResources returns null', async () => {
        mockRequest.body = {
          title: 'Test Question',
          body_md: 'Test body',
          difficulty: 'Easy',
        };

        asMock(Repo.createDraft).mockResolvedValue(
          dbRow({
            id: 'test-question',
            title: 'Test Question',
            body_md: 'Test body',
            difficulty: 'Easy',
          }),
        );
        asMock(Repo.updateWithResources).mockResolvedValue(null as any);

        await AdminController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalledWith({ error: 'internal_error' });
        expect(logger.log.error).toHaveBeenCalled();
      });

      it('should return 500 on unexpected error', async () => {
        mockRequest.body = {
          title: 'Test Question',
          body_md: 'Test body',
          difficulty: 'Easy',
        };

        asMock(Repo.createDraft).mockRejectedValue(new Error('Database error'));

        await AdminController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalledWith({ error: 'internal_error' });
        expect(logger.log.error).toHaveBeenCalled();
      });
    });
  });

  describe('update', () => {
    describe('validation', () => {
      it('should return 400 when id param is missing', async () => {
        mockRequest.params = {};

        await AdminController.update(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({ error: 'id param required' });
      });

      it('should return 400 for invalid difficulty', async () => {
        mockRequest.params = { id: 'test-question' };
        mockRequest.body = { difficulty: 'Invalid' };

        await AdminController.update(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          error: 'difficulty must be one of: Easy, Medium, Hard',
        });
      });

      it('should return 400 for invalid status', async () => {
        mockRequest.params = { id: 'test-question' };
        mockRequest.body = { status: 'invalid_status' };

        await AdminController.update(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          error: 'status must be one of: draft, published, archived',
        });
      });

      it('should return 400 when topics are not string array', async () => {
        mockRequest.params = { id: 'test-question' };
        mockRequest.body = { topics: 'not-an-array' };

        await AdminController.update(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          error: 'topics must be string[]',
        });
      });

      it('should return 400 when topics do not exist', async () => {
        mockRequest.params = { id: 'test-question' };
        mockRequest.body = { topics: ['arrays', 'missing-topic'] };

        setTopics([{ slug: 'arrays' }]);

        await AdminController.update(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          error: 'topics_not_found',
          missing: ['missing-topic'],
          hint: expect.any(String),
        });
      });

      it('should return 400 for invalid attachments format', async () => {
        mockRequest.params = { id: 'test-question' };
        mockRequest.body = { attachments: 'not-an-array' };

        await AdminController.update(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          error:
            'attachments must be an array of { object_key, filename, mime, [alt] }',
        });
      });

      it('should return 400 for invalid test_cases format', async () => {
        mockRequest.params = { id: 'test-question' };
        mockRequest.body = { test_cases: 'not-an-array' };

        await AdminController.update(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          error:
            'test_cases must be an array of { visibility, input_data, expected_output, [ordinal] }',
        });
      });
    });

    describe('successful updates', () => {
      it('should update title only', async () => {
        mockRequest.params = { id: 'test-question' };
        mockRequest.body = { title: 'Updated Title' };

        const mockUpdated = dbRow({
          id: 'test-question',
          title: 'Updated Title',
          body_md: 'Original body',
          difficulty: 'Easy' as const,
          status: 'draft' as const,
        });

        asMock(Repo.updateWithResources).mockResolvedValue(mockUpdated);
        asMock(Repo.getInternalResourcesBundle).mockResolvedValue(
          bundle({
            question_id: 'test-question',
            starter_code: '',
            test_cases: [],
          }),
        );

        await AdminController.update(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(Repo.updateWithResources).toHaveBeenCalledWith('test-question', {
          title: 'Updated Title',
        });
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Updated Title',
          }),
        );
      });

      it('should update multiple fields at once', async () => {
        mockRequest.params = { id: 'test-question' };
        mockRequest.body = {
          title: 'New Title',
          difficulty: 'hard',
          status: 'published',
        };

        const mockUpdated = dbRow({
          id: 'test-question',
          title: 'New Title',
          body_md: 'Body',
          difficulty: 'Hard' as const,
          status: 'published' as const,
        });

        asMock(Repo.updateWithResources).mockResolvedValue(mockUpdated);
        asMock(Repo.getInternalResourcesBundle).mockResolvedValue(
          bundle({
            question_id: 'test-question',
            starter_code: '',
            test_cases: [],
          }),
        );

        await AdminController.update(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(Repo.updateWithResources).toHaveBeenCalledWith(
          'test-question',
          expect.objectContaining({
            title: 'New Title',
            difficulty: 'Hard',
            status: 'published',
          }),
        );
      });

      it('should update starter_code and test_cases', async () => {
        mockRequest.params = { id: 'test-question' };
        mockRequest.body = {
          starter_code: 'function solve() {}',
          test_cases: [
            {
              visibility: 'sample',
              input_data: 'test',
              expected_output: 'result',
            },
          ],
        };

        const mockUpdated = dbRow({
          id: 'test-question',
          title: 'Title',
          body_md: 'Body',
          difficulty: 'Easy' as const,
          status: 'draft' as const,
        });

        asMock(Repo.updateWithResources).mockResolvedValue(mockUpdated);
        asMock(Repo.getInternalResourcesBundle).mockResolvedValue(
          bundle({
            question_id: 'test-question',
            starter_code: 'function solve() {}',
            test_cases: [
              {
                name: 'tc-1',
                visibility: 'sample',
                input_data: 'test',
                expected_output: 'result',
                ordinal: 1,
              },
            ],
          }),
        );

        await AdminController.update(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(Repo.updateWithResources).toHaveBeenCalledWith(
          'test-question',
          expect.objectContaining({
            starter_code: 'function solve() {}',
            test_cases: mockRequest.body.test_cases,
          }),
        );
      });

      it('should finalize attachments and rewrite markdown on update', async () => {
        mockRequest.params = { id: 'test-question' };
        mockRequest.body = {
          body_md: 'Updated ![img](pp://staging/new.png)',
          attachments: [
            {
              object_key: 'staging/new.png',
              filename: 'new.png',
              mime: 'image/png',
            },
          ],
        };

        const finalizedAtts = [
          {
            object_key: 'questions/test-question/new.png',
            filename: 'new.png',
            mime: 'image/png',
          },
        ];

        asMock(AttachmentService.finalizeStagedAttachments).mockResolvedValue(
          finalizedAtts,
        );
        asMock(Repo.updateWithResources).mockResolvedValue(
          dbRow({
            id: 'test-question',
            title: 'Title',
            body_md: 'Updated ![img](pp://questions/test-question/new.png)',
            difficulty: 'Easy' as const,
            status: 'draft' as const,
            topics: [],
            attachments: finalizedAtts,
          }),
        );
        asMock(Repo.getInternalResourcesBundle).mockResolvedValue(
          bundle({
            question_id: 'test-question',
            starter_code: '',
            test_cases: [],
          }),
        );

        await AdminController.update(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(Repo.updateWithResources).toHaveBeenCalledWith(
          'test-question',
          expect.objectContaining({
            body_md: 'Updated ![img](pp://questions/test-question/new.png)',
            attachments: finalizedAtts,
          }),
        );
      });
    });

    describe('error scenarios', () => {
      it('should return 404 when question not found', async () => {
        mockRequest.params = { id: 'non-existent' };
        mockRequest.body = { title: 'New Title' };

        asMock(Repo.updateWithResources).mockResolvedValue(null as any);

        await AdminController.update(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(mockStatus).toHaveBeenCalledWith(404);
        expect(mockJson).toHaveBeenCalledWith({ error: 'not_found' });
      });

      it('should return 500 on unexpected error', async () => {
        mockRequest.params = { id: 'test-question' };
        mockRequest.body = { title: 'New Title' };

        asMock(Repo.updateWithResources).mockRejectedValue(
          new Error('DB error'),
        );

        await AdminController.update(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalledWith({ error: 'internal_error' });
        expect(logger.log.error).toHaveBeenCalled();
      });
    });
  });

  describe('publish', () => {
    it('should return 400 when id param is missing', async () => {
      mockRequest.params = {};

      await AdminController.publish(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'id param required' });
    });

    it('should successfully publish a question', async () => {
      mockRequest.params = { id: 'test-question' };

      const mockPublished = dbRow({
        id: 'test-question',
        title: 'Test Question',
        body_md: 'Body',
        difficulty: 'Easy' as const,
        status: 'published' as const,
      });

      asMock(Repo.publish).mockResolvedValue(mockPublished);
      asMock(Repo.getInternalResourcesBundle).mockResolvedValue(
        bundle({
          question_id: 'test-question',
          status: 'published',
          starter_code: 'def solve():',
          test_cases: [
            {
              name: 'tc-1',
              visibility: 'sample',
              input_data: '1',
              expected_output: '2',
              ordinal: 1,
            },
          ],
        }),
      );

      await AdminController.publish(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(Repo.publish).toHaveBeenCalledWith('test-question');
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-question',
          status: 'published',
          starter_code: expect.any(String),
          test_cases: expect.any(Array),
        }),
      );
    });

    it('should return 404 when question not found', async () => {
      mockRequest.params = { id: 'non-existent' };

      asMock(Repo.publish).mockResolvedValue(null as any);

      await AdminController.publish(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'not_found' });
    });

    it('should return 500 on error', async () => {
      mockRequest.params = { id: 'test-question' };

      asMock(Repo.publish).mockRejectedValue(new Error('Publish failed'));

      await AdminController.publish(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'internal_error' });
      expect(logger.log.error).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('should list all questions with default pagination', async () => {
      mockRequest.query = {};

      const mockResult = {
        items: [
          publicView({
            id: 'q1',
            title: 'Question 1',
            difficulty: 'Easy' as const,
            status: 'published' as const,
          }),
        ],
        total: 1,
      };

      asMock(Service.listAll).mockResolvedValue(mockResult);

      await AdminController.list(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(Service.listAll).toHaveBeenCalledWith({});
      expect(mockJson).toHaveBeenCalledWith({
        items: mockResult.items,
        total: 1,
        page: 1,
        page_size: 20,
      });
    });

    it('should list questions with difficulty filter', async () => {
      mockRequest.query = { difficulty: 'Hard' };

      const mockResult = {
        items: [],
        total: 0,
      };

      asMock(Service.listAll).mockResolvedValue(mockResult);

      await AdminController.list(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(Service.listAll).toHaveBeenCalledWith({
        difficulty: 'Hard',
      });
    });

    it('should list questions with topics filter', async () => {
      mockRequest.query = { topics: 'arrays,hash-table' };

      const mockResult = {
        items: [],
        total: 0,
      };

      asMock(Service.listAll).mockResolvedValue(mockResult);

      await AdminController.list(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(Service.listAll).toHaveBeenCalledWith({
        topics: ['arrays', 'hash-table'],
      });
    });

    it('should list questions with search query', async () => {
      mockRequest.query = { q: 'two sum' };

      const mockResult = {
        items: [],
        total: 0,
      };

      asMock(Service.listAll).mockResolvedValue(mockResult);

      await AdminController.list(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(Service.listAll).toHaveBeenCalledWith({
        q: 'two sum',
      });
    });

    it('should list questions with pagination', async () => {
      mockRequest.query = { page: '2', page_size: '50' };

      const mockResult = {
        items: [],
        total: 100,
      };

      asMock(Service.listAll).mockResolvedValue(mockResult);

      await AdminController.list(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(Service.listAll).toHaveBeenCalledWith({
        page: 2,
        page_size: 50,
      });
      expect(mockJson).toHaveBeenCalledWith({
        items: [],
        total: 100,
        page: 2,
        page_size: 50,
      });
    });

    it('should list questions with combined filters', async () => {
      mockRequest.query = {
        difficulty: 'medium',
        topics: 'arrays',
        q: 'search term',
        page: '3',
        page_size: '10',
      };

      const mockResult = {
        items: [],
        total: 25,
      };

      asMock(Service.listAll).mockResolvedValue(mockResult);

      await AdminController.list(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(Service.listAll).toHaveBeenCalledWith({
        difficulty: 'Medium',
        topics: ['arrays'],
        q: 'search term',
        page: 3,
        page_size: 10,
      });
    });

    it('should handle topics as array in query', async () => {
      mockRequest.query = { topics: ['arrays', 'strings'] as any };

      const mockResult = {
        items: [],
        total: 0,
      };

      asMock(Service.listAll).mockResolvedValue(mockResult);

      await AdminController.list(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(Service.listAll).toHaveBeenCalledWith({
        topics: ['arrays', 'strings'],
      });
    });

    it('should handle invalid page number', async () => {
      mockRequest.query = { page: 'not-a-number' } as any;

      asMock(Service.listAll).mockResolvedValue({ items: [], total: 0 });

      await AdminController.list(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(Service.listAll).toHaveBeenCalledWith({});
    });

    it('should handle invalid page_size', async () => {
      mockRequest.query = { page_size: 'invalid' } as any;

      asMock(Service.listAll).mockResolvedValue({ items: [], total: 0 });

      await AdminController.list(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(Service.listAll).toHaveBeenCalledWith({});
    });

    it('should handle empty topics string', async () => {
      mockRequest.query = { topics: '' } as any;

      asMock(Service.listAll).mockResolvedValue({ items: [], total: 0 });

      await AdminController.list(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(Service.listAll).toHaveBeenCalledWith({ topics: [] });
    });
  });

  describe('archive', () => {
    it('should return 400 when id param is missing', async () => {
      mockRequest.params = {};

      await AdminController.archive(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'id param required' });
    });

    it('should return 400 when id is empty string', async () => {
      mockRequest.params = { id: '' };

      await AdminController.archive(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'id param required' });
    });

    it('should successfully archive a question', async () => {
      mockRequest.params = { id: 'test-question' };

      const mockArchived = dbRow({
        id: 'test-question',
        title: 'Test Question',
        body_md: 'Body',
        difficulty: 'Easy' as const,
        status: 'archived' as const,
      });

      asMock(Repo.archive).mockResolvedValue(mockArchived);

      await AdminController.archive(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(Repo.archive).toHaveBeenCalledWith('test-question');
      expect(mockJson).toHaveBeenCalledWith(mockArchived);
    });

    it('should return 404 when question not found or not published', async () => {
      mockRequest.params = { id: 'non-existent' };

      asMock(Repo.archive).mockResolvedValue(null as any);

      await AdminController.archive(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'not_found_or_not_published',
      });
    });
  });

  describe('getById', () => {
    it('should return 400 when id param is missing', async () => {
      mockRequest.params = {};

      await AdminController.getById(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'id param required' });
    });

    it('should return 400 when id is empty string', async () => {
      mockRequest.params = { id: '' };

      await AdminController.getById(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'id param required' });
    });

    it('should successfully get question by id with resources', async () => {
      mockRequest.params = { id: 'test-question' };

      const mockQuestion = publicView({
        id: 'test-question',
        title: 'Test Question',
        body_md: 'Body',
        body_html: '<p>Body</p>',
        difficulty: 'Medium' as const,
        status: 'draft' as const,
        topics: ['arrays'],
      });

      const mockBundle = bundle({
        question_id: 'test-question',
        starter_code: 'def solve():',
        test_cases: [
          {
            name: 'sample-1',
            visibility: 'sample',
            input_data: '[1,2]',
            expected_output: '3',
            ordinal: 1,
          },
          {
            name: 'hidden-1',
            visibility: 'hidden',
            input_data: '[4,5]',
            expected_output: '9',
            ordinal: 2,
          },
        ],
      });

      asMock(Service.getQuestionWithHtml).mockResolvedValue(mockQuestion);
      asMock(Repo.getInternalResourcesBundle).mockResolvedValue(mockBundle);

      await AdminController.getById(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(Service.getQuestionWithHtml).toHaveBeenCalledWith('test-question');
      expect(Repo.getInternalResourcesBundle).toHaveBeenCalledWith(
        'test-question',
      );
      expect(mockJson).toHaveBeenCalledWith({
        ...mockQuestion,
        starter_code: mockBundle.starter_code,
        test_cases: mockBundle.test_cases,
      });
    });

    it('should return empty resources when bundle is null', async () => {
      mockRequest.params = { id: 'test-question' };

      const mockQuestion = publicView({
        id: 'test-question',
        title: 'Test Question',
        body_md: 'Body',
        body_html: '<p>Body</p>',
        difficulty: 'Easy' as const,
        status: 'published' as const,
        topics: [],
      });

      asMock(Service.getQuestionWithHtml).mockResolvedValue(mockQuestion);
      asMock(Repo.getInternalResourcesBundle).mockResolvedValue(null);

      await AdminController.getById(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockJson).toHaveBeenCalledWith({
        ...mockQuestion,
        starter_code: '',
        test_cases: [],
      });
    });

    it('should return 404 when question not found', async () => {
      mockRequest.params = { id: 'non-existent' };

      asMock(Service.getQuestionWithHtml).mockResolvedValue(undefined as any);

      await AdminController.getById(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'not found' });
    });

    it('should return 500 on unexpected error', async () => {
      mockRequest.params = { id: 'test-question' };

      asMock(Service.getQuestionWithHtml).mockRejectedValue(
        new Error('Database error'),
      );

      await AdminController.getById(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'internal_error' });
      expect(logger.log.error).toHaveBeenCalled();
    });
  });

  describe('helper functions and edge cases', () => {
    describe('test case validation', () => {
      it('should reject test cases with invalid visibility', async () => {
        mockRequest.body = {
          title: 'Test',
          body_md: 'Body',
          difficulty: 'Easy',
          test_cases: [
            {
              visibility: 'invalid',
              input_data: 'test',
              expected_output: 'result',
            },
          ],
        };

        asMock(slugUtils.slugify).mockReturnValue('test');
        setTopics([]);

        await AdminController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(Repo.createDraft).toHaveBeenCalled();
      });

      it('should reject test cases with missing fields', async () => {
        mockRequest.body = {
          title: 'Test',
          body_md: 'Body',
          difficulty: 'Easy',
          test_cases: [
            {
              visibility: 'sample',
              input_data: 'test',
              // missing expected_output
            } as any,
          ],
        };

        asMock(slugUtils.slugify).mockReturnValue('test');
        setTopics([]);

        await AdminController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(Repo.createDraft).toHaveBeenCalled();
      });

      it('should accept test cases with valid ordinal', async () => {
        mockRequest.body = {
          title: 'Test',
          body_md: 'Body',
          difficulty: 'Easy',
          test_cases: [
            {
              visibility: 'sample',
              input_data: 'test',
              expected_output: 'result',
              ordinal: 1,
            },
          ],
        };

        asMock(slugUtils.slugify).mockReturnValue('test');
        setTopics([]);
        asMock(Repo.createDraft).mockResolvedValue(
          dbRow({
            id: 'test',
            title: 'Test',
            body_md: 'Body',
          }),
        );
        asMock(Repo.updateWithResources).mockResolvedValue(
          dbRow({
            id: 'test',
            title: 'Test',
            body_md: 'Body',
          }),
        );
        asMock(Repo.getInternalResourcesBundle).mockResolvedValue(
          bundle({
            question_id: 'test',
            test_cases: [
              {
                name: 'tc-1',
                visibility: 'sample',
                input_data: 'test',
                expected_output: 'result',
                ordinal: 1,
              },
            ],
          }),
        );

        await AdminController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(Repo.updateWithResources).toHaveBeenCalledWith(
          'test',
          expect.objectContaining({
            test_cases: mockRequest.body.test_cases,
          }),
        );
      });

      it('should reject test cases with invalid ordinal', async () => {
        mockRequest.body = {
          title: 'Test',
          body_md: 'Body',
          difficulty: 'Easy',
          test_cases: [
            {
              visibility: 'sample',
              input_data: 'test',
              expected_output: 'result',
              ordinal: 'not-a-number',
            } as any,
          ],
        };

        asMock(slugUtils.slugify).mockReturnValue('test');
        setTopics([]);

        await AdminController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(Repo.createDraft).toHaveBeenCalled();
      });
    });

    describe('attachment validation', () => {
      it('should reject invalid attachment format', async () => {
        mockRequest.body = {
          title: 'Test',
          body_md: 'Body',
          difficulty: 'Easy',
          attachments: [
            {
              object_key: 'staging/test.png',
              // missing mime and filename
            } as any,
          ],
        };

        asMock(slugUtils.slugify).mockReturnValue('test');
        setTopics([]);

        await AdminController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(Repo.createDraft).toHaveBeenCalled();
      });

      it('should accept attachments with optional alt text', async () => {
        mockRequest.body = {
          title: 'Test',
          body_md: 'Body',
          difficulty: 'Easy',
          attachments: [
            {
              object_key: 'staging/test.png',
              filename: 'test.png',
              mime: 'image/png',
              alt: 'Test image',
            },
          ],
        };

        asMock(slugUtils.slugify).mockReturnValue('test');
        setTopics([]);
        asMock(AttachmentService.finalizeStagedAttachments).mockResolvedValue([
          {
            object_key: 'questions/test/test.png',
            filename: 'test.png',
            mime: 'image/png',
            alt: 'Test image',
          },
        ]);
        asMock(Repo.createDraft).mockResolvedValue(
          dbRow({
            id: 'test',
            title: 'Test',
            body_md: 'Body',
          }),
        );
        asMock(Repo.updateWithResources).mockResolvedValue(
          dbRow({
            id: 'test',
            title: 'Test',
            body_md: 'Body',
          }),
        );
        asMock(Repo.getInternalResourcesBundle).mockResolvedValue(
          bundle({
            question_id: 'test',
            starter_code: '',
            test_cases: [],
          }),
        );

        await AdminController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(mockStatus).toHaveBeenCalledWith(201);
      });
    });

    describe('markdown rewriting', () => {
      it('should not modify markdown without staging references', async () => {
        mockRequest.params = { id: 'test-question' };
        mockRequest.body = {
          body_md: 'Regular markdown without images',
        };

        asMock(Repo.updateWithResources).mockResolvedValue(
          dbRow({
            id: 'test-question',
            title: 'Test',
            body_md: 'Regular markdown without images',
          }),
        );
        asMock(Repo.getInternalResourcesBundle).mockResolvedValue(
          bundle({
            question_id: 'test-question',
            starter_code: '',
            test_cases: [],
          }),
        );

        await AdminController.update(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(Repo.updateWithResources).toHaveBeenCalledWith(
          'test-question',
          expect.objectContaining({
            body_md: 'Regular markdown without images',
          }),
        );
      });

      it('should handle multiple attachment references in markdown', async () => {
        mockRequest.body = {
          title: 'Test',
          body_md:
            '![img1](pp://staging/img1.png) and ![img2](pp://staging/img2.png)',
          difficulty: 'Easy',
          attachments: [
            {
              object_key: 'staging/img1.png',
              filename: 'img1.png',
              mime: 'image/png',
            },
            {
              object_key: 'staging/img2.png',
              filename: 'img2.png',
              mime: 'image/png',
            },
          ],
        };

        asMock(slugUtils.slugify).mockReturnValue('test');
        setTopics([]);
        asMock(Repo.createDraft).mockResolvedValue(
          dbRow({
            id: 'test',
            title: 'Test',
            body_md: mockRequest.body.body_md,
          }),
        );
        asMock(AttachmentService.finalizeStagedAttachments).mockResolvedValue([
          {
            object_key: 'questions/test/img1.png',
            filename: 'img1.png',
            mime: 'image/png',
          },
          {
            object_key: 'questions/test/img2.png',
            filename: 'img2.png',
            mime: 'image/png',
          },
        ]);
        asMock(Repo.updateWithResources).mockResolvedValue(
          dbRow({
            id: 'test',
            title: 'Test',
            body_md:
              '![img1](pp://questions/test/img1.png) and ![img2](pp://questions/test/img2.png)',
          }),
        );
        asMock(Repo.getInternalResourcesBundle).mockResolvedValue(
          bundle({
            question_id: 'test',
            starter_code: '',
            test_cases: [],
          }),
        );

        await AdminController.create(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(Repo.updateWithResources).toHaveBeenCalledWith(
          'test',
          expect.objectContaining({
            body_md:
              '![img1](pp://questions/test/img1.png) and ![img2](pp://questions/test/img2.png)',
          }),
        );
      });
    });

    describe('query parameter parsing (extra edges)', () => {
      it('should handle invalid page number', async () => {
        mockRequest.query = { page: 'not-a-number' } as any;

        asMock(Service.listAll).mockResolvedValue({ items: [], total: 0 });

        await AdminController.list(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(Service.listAll).toHaveBeenCalledWith({});
      });

      it('should handle invalid page_size', async () => {
        mockRequest.query = { page_size: 'invalid' } as any;

        asMock(Service.listAll).mockResolvedValue({ items: [], total: 0 });

        await AdminController.list(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(Service.listAll).toHaveBeenCalledWith({});
      });

      it('should handle empty topics string', async () => {
        mockRequest.query = { topics: '' } as any;

        asMock(Service.listAll).mockResolvedValue({ items: [], total: 0 });

        await AdminController.list(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(Service.listAll).toHaveBeenCalledWith({ topics: [] });
      });
    });
  });
});
