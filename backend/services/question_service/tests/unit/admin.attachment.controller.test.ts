import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { Response } from 'express';
import type { AuthRequest } from '../../src/middleware/auth.js';
import { Role } from '../../src/middleware/auth.js';

// 1) Mock ESM dependencies *before* importing the controller
jest.unstable_mockModule('../../src/services/AttachmentService.js', () => ({
  signUploadUrl: jest.fn(),
  signViewUrl: jest.fn(),
}));

jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// 2) Import mocked modules and the SUT
const AttachmentService = await import(
  '../../src/services/AttachmentService.js'
);
const { log } = await import('../../src/utils/logger.js');
const AdminAttachmentController = await import(
  '../../src/controllers/AdminAttachmentController.js'
);

// 3) Strongly-typed function refs for mocked functions
const signUploadUrl = AttachmentService.signUploadUrl as jest.MockedFunction<
  typeof AttachmentService.signUploadUrl
>;
const signViewUrl = AttachmentService.signViewUrl as jest.MockedFunction<
  typeof AttachmentService.signViewUrl
>;

// 4) Helper to build a Response-shaped mock with jest.fn spies
function makeRes(): Response {
  const res = {} as Response;

  const statusMock = jest.fn((code: number) => res);
  const jsonMock = jest.fn((body?: any) => res);

  res.status = statusMock as unknown as Response['status'];
  res.json = jsonMock as unknown as Response['json'];

  return res;
}

describe('AdminAttachmentController - Unit', () => {
  let req: Partial<AuthRequest> & {
    get?: AuthRequest['get'];
    user?: AuthRequest['user'];
  };
  let res: Response;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    res = makeRes();
    statusMock = res.status as unknown as jest.Mock;
    jsonMock = res.json as unknown as jest.Mock;

    req = {
      body: {},
      get: jest.fn() as unknown as AuthRequest['get'],
      user: {
        role: Role.ADMIN,
        userId: 'admin-123',
        username: 'admin',
        // satisfy JwtPayload (timestamps not used in tests)
        iat: 0,
        exp: 9999999999,
      },
    };
  });

  describe('signUpload', () => {
    describe('authentication and authorization', () => {
      it('returns 403 when user is not authenticated', async () => {
        delete req.user;

        await AdminAttachmentController.signUpload(req as AuthRequest, res);

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'forbidden' });
        expect(log.warn).toHaveBeenCalledWith(
          '[signUpload] forbidden: missing/invalid user role',
          'no-user',
        );
      });

      it('returns 403 when user role is not ADMIN', async () => {
        req.user = {
          role: 'user' as unknown as Role,
          userId: 'user-123',
          username: 'user',
          iat: 0,
          exp: 9999999999,
        } as any;

        await AdminAttachmentController.signUpload(req as AuthRequest, res);

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'forbidden' });
        expect(log.warn).toHaveBeenCalledWith(
          '[signUpload] forbidden: missing/invalid user role',
          'user',
        );
      });
    });

    describe('validation', () => {
      it('returns 400 when content_type is missing', async () => {
        req.body = { filename: 'test.png' };

        await AdminAttachmentController.signUpload(req as AuthRequest, res);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'content_type and filename are required (strings)',
        });
        expect(log.warn).toHaveBeenCalledWith(
          '[signUpload] bad request: missing fields',
          expect.objectContaining({
            admin: 'admin-123',
            contentTypePresent: false,
            filenamePresent: true,
          }),
        );
      });

      it('returns 400 when filename is missing', async () => {
        req.body = { content_type: 'image/png' };

        await AdminAttachmentController.signUpload(req as AuthRequest, res);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'content_type and filename are required (strings)',
        });
      });

      it('returns 400 when both are missing', async () => {
        req.body = {};

        await AdminAttachmentController.signUpload(req as AuthRequest, res);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'content_type and filename are required (strings)',
        });
      });

      it('returns 400 when content_type is not a string', async () => {
        req.body = { content_type: 123, filename: 'x.png' } as any;

        await AdminAttachmentController.signUpload(req as AuthRequest, res);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'content_type and filename are required (strings)',
        });
      });

      it('returns 400 when filename is not a string', async () => {
        req.body = { content_type: 'image/png', filename: 111 } as any;

        await AdminAttachmentController.signUpload(req as AuthRequest, res);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'content_type and filename are required (strings)',
        });
      });

      it('returns 400 on missing body', async () => {
        req.body = undefined;

        await AdminAttachmentController.signUpload(req as AuthRequest, res);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'content_type and filename are required (strings)',
        });
      });
    });

    describe('success', () => {
      it('signs upload with required fields only', async () => {
        req.body = { content_type: 'image/png', filename: 'test.png' };

        // keep only known/required fields to satisfy type
        signUploadUrl.mockResolvedValue({
          object_key: 'staging/admin-123/test.png',
          max_bytes: 10_485_760,
          expires_at: '2025-01-01T00:00:00Z',
        } as any);

        await AdminAttachmentController.signUpload(req as AuthRequest, res);

        expect(AttachmentService.signUploadUrl).toHaveBeenCalledWith(
          'admin-123',
          expect.objectContaining({
            content_type: 'image/png',
            filename: 'test.png',
          }),
          undefined,
        );
        expect(AttachmentService.signUploadUrl).toHaveBeenCalledWith(
          'admin-123',
          expect.not.objectContaining({ suggested_prefix: expect.anything() }),
          undefined,
        );

        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            object_key: 'staging/admin-123/test.png',
          }),
        );
        expect(log.info).toHaveBeenCalledWith(
          '[signUpload] success',
          expect.objectContaining({
            admin: 'admin-123',
            object_key: 'staging/admin-123/test.png',
            max_bytes: 10_485_760,
            expires_at: '2025-01-01T00:00:00Z',
          }),
        );
      });

      it('passes suggested_prefix when provided', async () => {
        req.body = {
          content_type: 'application/pdf',
          filename: 'doc.pdf',
          suggested_prefix: 'questions/two-sum',
        };

        signUploadUrl.mockResolvedValue({
          object_key: 'questions/two-sum/doc.pdf',
          max_bytes: 10_485_760,
          expires_at: '2025-01-01T00:00:00Z',
        } as any);

        await AdminAttachmentController.signUpload(req as AuthRequest, res);

        expect(AttachmentService.signUploadUrl).toHaveBeenCalledWith(
          'admin-123',
          {
            content_type: 'application/pdf',
            filename: 'doc.pdf',
            suggested_prefix: 'questions/two-sum',
          },
          undefined,
        );
      });

      it('forwards x-upload-session header', async () => {
        req.body = { content_type: 'image/jpeg', filename: 'p.jpg' };
        (req.get as jest.Mock).mockReturnValue('01H2QWERTY123456');

        signUploadUrl.mockResolvedValue({
          object_key: 'staging/admin-123/p.jpg',
          max_bytes: 10_485_760,
          expires_at: '2025-01-01T00:00:00Z',
        } as any);

        await AdminAttachmentController.signUpload(req as AuthRequest, res);

        expect(req.get as jest.Mock).toHaveBeenCalledWith('x-upload-session');
        expect(AttachmentService.signUploadUrl).toHaveBeenCalledWith(
          'admin-123',
          expect.any(Object),
          '01H2QWERTY123456',
        );
      });

      it('ignores non-string suggested_prefix', async () => {
        req.body = {
          content_type: 'image/png',
          filename: 'x.png',
          suggested_prefix: 123,
        } as any;

        signUploadUrl.mockResolvedValue({
          object_key: 'staging/admin-123/x.png',
          max_bytes: 10_485_760,
          expires_at: '2025-01-01T00:00:00Z',
        } as any);

        await AdminAttachmentController.signUpload(req as AuthRequest, res);

        expect(AttachmentService.signUploadUrl).toHaveBeenCalledWith(
          'admin-123',
          expect.not.objectContaining({ suggested_prefix: expect.anything() }),
          undefined,
        );
      });
    });

    describe('errors', () => {
      it('returns 400 on service error', async () => {
        req.body = { content_type: 'image/png', filename: 'x.png' };

        signUploadUrl.mockRejectedValue(new Error('S3 service unavailable'));

        await AdminAttachmentController.signUpload(req as AuthRequest, res);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'unknown_error' });
        expect(log.error).toHaveBeenCalledWith(
          '[signUpload] failed',
          expect.objectContaining({
            admin: 'admin-123',
            error: 'S3 service unavailable',
            stack: expect.any(String),
          }),
        );
      });

      it('handles non-Error exceptions', async () => {
        req.body = { content_type: 'image/png', filename: 'x.png' };

        signUploadUrl.mockRejectedValue('string error');

        await AdminAttachmentController.signUpload(req as AuthRequest, res);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'unknown_error' });
        expect(log.error).toHaveBeenCalledWith(
          '[signUpload] failed',
          expect.objectContaining({ error: 'string error' }),
        );
      });
    });
  });

  describe('signView', () => {
    describe('authentication and authorization', () => {
      it('returns 403 when user is not authenticated', async () => {
        delete req.user;

        await AdminAttachmentController.signView(req as AuthRequest, res);

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'forbidden' });
        expect(log.warn).toHaveBeenCalledWith(
          '[signView] forbidden: missing/invalid user role',
          'no-user',
        );
      });

      it('returns 403 when user role is not ADMIN', async () => {
        req.user = {
          role: 'user' as unknown as Role,
          userId: 'user-123',
          username: 'user',
          iat: 0,
          exp: 9999999999,
        } as any;

        await AdminAttachmentController.signView(req as AuthRequest, res);

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'forbidden' });
      });
    });

    describe('validation', () => {
      it('returns 400 when object_key is missing', async () => {
        req.body = {};

        await AdminAttachmentController.signView(req as AuthRequest, res);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'object_key is required (string)',
        });
        expect(log.warn).toHaveBeenCalledWith(
          '[signView] bad request: missing object_key',
          expect.objectContaining({ admin: 'admin-123' }),
        );
      });

      it('returns 400 when object_key is not a string', async () => {
        req.body = { object_key: 123 } as any;

        await AdminAttachmentController.signView(req as AuthRequest, res);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'object_key is required (string)',
        });
      });

      it('returns 400 on missing body', async () => {
        req.body = undefined;

        await AdminAttachmentController.signView(req as AuthRequest, res);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'object_key is required (string)',
        });
      });
    });

    describe('key authorization', () => {
      it('allows keys starting with "questions/"', async () => {
        req.body = { object_key: 'questions/two-sum/diagram.png' };

        signViewUrl.mockResolvedValue({
          object_key: 'questions/two-sum/diagram.png',
          expires_at: '2025-01-01T00:00:00Z',
        } as any);

        await AdminAttachmentController.signView(req as AuthRequest, res);

        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            object_key: 'questions/two-sum/diagram.png',
          }),
        );
        expect(AttachmentService.signViewUrl).toHaveBeenCalledWith(
          'questions/two-sum/diagram.png',
          {},
        );
      });

      it('allows keys in own staging area', async () => {
        req.body = { object_key: 'staging/admin-123/test.png' };

        signViewUrl.mockResolvedValue({
          object_key: 'staging/admin-123/test.png',
          expires_at: '2025-01-01T00:00:00Z',
        } as any);

        await AdminAttachmentController.signView(req as AuthRequest, res);

        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            object_key: 'staging/admin-123/test.png',
          }),
        );
        expect(AttachmentService.signViewUrl).toHaveBeenCalledWith(
          'staging/admin-123/test.png',
          {},
        );
      });

      it('rejects keys in another admin staging area', async () => {
        req.body = { object_key: 'staging/other-admin/test.png' };

        await AdminAttachmentController.signView(req as AuthRequest, res);

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'key_not_allowed' });
        expect(log.warn).toHaveBeenCalledWith(
          '[signView] key_not_allowed',
          expect.objectContaining({
            admin: 'admin-123',
            attempted_key: 'staging/other-admin/test.png',
          }),
        );
      });

      it('rejects keys not in allowed prefixes', async () => {
        req.body = { object_key: 'private/secret.txt' };

        await AdminAttachmentController.signView(req as AuthRequest, res);

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'key_not_allowed' });
      });

      it('rejects empty staging prefix without user ID', async () => {
        req.body = { object_key: 'staging//test.png' };

        await AdminAttachmentController.signView(req as AuthRequest, res);

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'key_not_allowed' });
      });
    });

    describe('success', () => {
      it('signs view URL with minimal options', async () => {
        req.body = { object_key: 'questions/test/file.pdf' };

        signViewUrl.mockResolvedValue({
          object_key: 'questions/test/file.pdf',
          expires_at: '2025-01-01T00:00:00Z',
        } as any);

        await AdminAttachmentController.signView(req as AuthRequest, res);

        expect(AttachmentService.signViewUrl).toHaveBeenCalledWith(
          'questions/test/file.pdf',
          {},
        );
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({ object_key: 'questions/test/file.pdf' }),
        );
      });

      it('includes as_attachment when true', async () => {
        req.body = {
          object_key: 'questions/test/file.pdf',
          as_attachment: true,
        };

        signViewUrl.mockResolvedValue({
          object_key: 'questions/test/file.pdf',
          expires_at: '2025-01-01T00:00:00Z',
        } as any);

        await AdminAttachmentController.signView(req as AuthRequest, res);

        expect(AttachmentService.signViewUrl).toHaveBeenCalledWith(
          'questions/test/file.pdf',
          { asAttachment: true },
        );
      });

      it('does not include as_attachment when false', async () => {
        req.body = {
          object_key: 'questions/test/file.pdf',
          as_attachment: false,
        };

        signViewUrl.mockResolvedValue({
          object_key: 'questions/test/file.pdf',
          expires_at: '2025-01-01T00:00:00Z',
        } as any);

        await AdminAttachmentController.signView(req as AuthRequest, res);

        expect(AttachmentService.signViewUrl).toHaveBeenCalledWith(
          'questions/test/file.pdf',
          {},
        );
      });

      it('passes filename option', async () => {
        req.body = {
          object_key: 'questions/test/file.pdf',
          filename: 'custom.pdf',
        };

        signViewUrl.mockResolvedValue({
          object_key: 'questions/test/file.pdf',
          expires_at: '2025-01-01T00:00:00Z',
        } as any);

        await AdminAttachmentController.signView(req as AuthRequest, res);

        expect(AttachmentService.signViewUrl).toHaveBeenCalledWith(
          'questions/test/file.pdf',
          { filename: 'custom.pdf' },
        );
      });

      it('passes content_type_hint option', async () => {
        req.body = {
          object_key: 'questions/test/file.bin',
          content_type_hint: 'application/octet-stream',
        };

        signViewUrl.mockResolvedValue({
          object_key: 'questions/test/file.bin',
          expires_at: '2025-01-01T00:00:00Z',
        } as any);

        await AdminAttachmentController.signView(req as AuthRequest, res);

        expect(AttachmentService.signViewUrl).toHaveBeenCalledWith(
          'questions/test/file.bin',
          { contentTypeHint: 'application/octet-stream' },
        );
      });

      it('passes all options when provided', async () => {
        req.body = {
          object_key: 'questions/test/file.pdf',
          as_attachment: true,
          filename: 'download.pdf',
          content_type_hint: 'application/pdf',
        };

        signViewUrl.mockResolvedValue({
          object_key: 'questions/test/file.pdf',
          expires_at: '2025-01-01T00:00:00Z',
        } as any);

        await AdminAttachmentController.signView(req as AuthRequest, res);

        expect(AttachmentService.signViewUrl).toHaveBeenCalledWith(
          'questions/test/file.pdf',
          {
            asAttachment: true,
            filename: 'download.pdf',
            contentTypeHint: 'application/pdf',
          },
        );
        expect(log.info).toHaveBeenCalledWith(
          '[signView] request',
          expect.objectContaining({
            admin: 'admin-123',
            object_key: 'questions/test/file.pdf',
            as_attachment: true,
            filename: 'download.pdf',
            contentTypeHint: 'application/pdf',
          }),
        );
      });

      it('ignores non-boolean as_attachment', async () => {
        req.body = {
          object_key: 'questions/test/file.pdf',
          as_attachment: 'true',
        } as any;

        signViewUrl.mockResolvedValue({
          object_key: 'questions/test/file.pdf',
          expires_at: '2025-01-01T00:00:00Z',
        } as any);

        await AdminAttachmentController.signView(req as AuthRequest, res);

        expect(AttachmentService.signViewUrl).toHaveBeenCalledWith(
          'questions/test/file.pdf',
          {},
        );
      });

      it('ignores non-string filename', async () => {
        req.body = {
          object_key: 'questions/test/file.pdf',
          filename: 123,
        } as any;

        signViewUrl.mockResolvedValue({
          object_key: 'questions/test/file.pdf',
          expires_at: '2025-01-01T00:00:00Z',
        } as any);

        await AdminAttachmentController.signView(req as AuthRequest, res);

        expect(AttachmentService.signViewUrl).toHaveBeenCalledWith(
          'questions/test/file.pdf',
          {},
        );
      });

      it('ignores non-string content_type_hint', async () => {
        req.body = {
          object_key: 'questions/test/file.pdf',
          content_type_hint: 123,
        } as any;

        signViewUrl.mockResolvedValue({
          object_key: 'questions/test/file.pdf',
          expires_at: '2025-01-01T00:00:00Z',
        } as any);

        await AdminAttachmentController.signView(req as AuthRequest, res);

        expect(AttachmentService.signViewUrl).toHaveBeenCalledWith(
          'questions/test/file.pdf',
          {},
        );
      });
    });

    describe('errors', () => {
      it('maps NotFound to 404', async () => {
        req.body = { object_key: 'questions/missing/file.pdf' };

        signViewUrl.mockRejectedValue(
          new Error('NotFound: Object does not exist'),
        );

        await AdminAttachmentController.signView(req as AuthRequest, res);

        expect(statusMock).toHaveBeenCalledWith(404);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'object_not_found' });
        expect(log.warn).toHaveBeenCalledWith(
          '[signView] object_not_found',
          expect.objectContaining({
            admin: 'admin-123',
            error: 'NotFound: Object does not exist',
          }),
        );
      });

      it('maps generic errors to 400 with message if present', async () => {
        req.body = { object_key: 'questions/test/file.pdf' };

        signViewUrl.mockRejectedValue(new Error('Invalid request'));

        await AdminAttachmentController.signView(req as AuthRequest, res);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid request' });
        expect(log.error).toHaveBeenCalledWith(
          '[signView] failed',
          expect.objectContaining({
            admin: 'admin-123',
            error: 'Invalid request',
            stack: expect.any(String),
          }),
        );
      });

      it('returns unknown_error when message is empty', async () => {
        req.body = { object_key: 'questions/test/file.pdf' };

        signViewUrl.mockRejectedValue(new Error(''));

        await AdminAttachmentController.signView(req as AuthRequest, res);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'unknown_error' });
      });

      it('handles non-Error exceptions (string)', async () => {
        req.body = { object_key: 'questions/test/file.pdf' };

        signViewUrl.mockRejectedValue('string error');

        await AdminAttachmentController.signView(req as AuthRequest, res);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'string error' });
      });
    });
  });
});
