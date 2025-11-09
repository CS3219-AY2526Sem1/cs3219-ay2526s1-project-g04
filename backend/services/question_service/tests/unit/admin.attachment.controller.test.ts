// tests/unit/admin.attachment.controller.test.ts
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

// 2) Now import the mocked modules and the SUT
const AttachmentService = await import(
  '../../src/services/AttachmentService.js'
);
const { log } = await import('../../src/utils/logger.js');
const AdminAttachmentController = await import(
  '../../src/controllers/AdminAttachmentController.js'
);

describe('AdminAttachmentController - Unit', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnThis();

    mockResponse = {
      json: jsonMock,
      status: statusMock,
    };

    mockRequest = {
      body: {},
      get: jest.fn(),
      user: {
        role: Role.ADMIN,
        userId: 'admin-123',
        sub: 'admin-123',
      } as any,
    };
  });

  describe('signUpload', () => {
    describe('authentication and authorization', () => {
      it('returns 403 when user is not authenticated', async () => {
        mockRequest.user = undefined;

        await AdminAttachmentController.signUpload(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'forbidden' });
        expect(log.warn).toHaveBeenCalledWith(
          '[signUpload] forbidden: missing/invalid user role',
          'no-user',
        );
      });

      it('returns 403 when user role is not ADMIN', async () => {
        mockRequest.user = {
          role: 'user' as unknown as Role,
          userId: 'user-123',
          sub: 'user-123',
        } as any;

        await AdminAttachmentController.signUpload(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

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
        mockRequest.body = { filename: 'test.png' };

        await AdminAttachmentController.signUpload(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

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
        mockRequest.body = { content_type: 'image/png' };

        await AdminAttachmentController.signUpload(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'content_type and filename are required (strings)',
        });
      });

      it('returns 400 when both are missing', async () => {
        mockRequest.body = {};

        await AdminAttachmentController.signUpload(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'content_type and filename are required (strings)',
        });
      });

      it('returns 400 when content_type is not a string', async () => {
        mockRequest.body = { content_type: 123, filename: 'x.png' } as any;

        await AdminAttachmentController.signUpload(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'content_type and filename are required (strings)',
        });
      });

      it('returns 400 when filename is not a string', async () => {
        mockRequest.body = { content_type: 'image/png', filename: 111 } as any;

        await AdminAttachmentController.signUpload(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'content_type and filename are required (strings)',
        });
      });

      it('returns 400 on missing body', async () => {
        mockRequest.body = undefined;

        await AdminAttachmentController.signUpload(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'content_type and filename are required (strings)',
        });
      });
    });

    describe('success', () => {
      it('signs upload with required fields only', async () => {
        mockRequest.body = { content_type: 'image/png', filename: 'test.png' };

        (AttachmentService.signUploadUrl as jest.Mock).mockResolvedValue({
          object_key: 'staging/admin-123/test.png',
          signed_url: 'https://s3.aws.com/signed-url',
          max_bytes: 10485760,
          expires_at: '2025-01-01T00:00:00Z',
        });

        await AdminAttachmentController.signUpload(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

        expect(AttachmentService.signUploadUrl).toHaveBeenCalledWith(
          'admin-123',
          {
            content_type: 'image/png',
            filename: 'test.png',
            suggested_prefix: undefined,
          },
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
            max_bytes: 10485760,
            expires_at: '2025-01-01T00:00:00Z',
          }),
        );
      });

      it('passes suggested_prefix when provided', async () => {
        mockRequest.body = {
          content_type: 'application/pdf',
          filename: 'doc.pdf',
          suggested_prefix: 'questions/two-sum',
        };

        (AttachmentService.signUploadUrl as jest.Mock).mockResolvedValue({
          object_key: 'questions/two-sum/doc.pdf',
          signed_url: 'https://s3.aws.com/signed-url',
          max_bytes: 10485760,
          expires_at: '2025-01-01T00:00:00Z',
        });

        await AdminAttachmentController.signUpload(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

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
        mockRequest.body = { content_type: 'image/jpeg', filename: 'p.jpg' };
        (mockRequest.get as jest.Mock).mockReturnValue('01H2QWERTY123456');

        (AttachmentService.signUploadUrl as jest.Mock).mockResolvedValue({
          object_key: 'staging/admin-123/p.jpg',
          signed_url: 'https://s3.aws.com/signed-url',
          max_bytes: 10485760,
          expires_at: '2025-01-01T00:00:00Z',
        });

        await AdminAttachmentController.signUpload(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

        expect(mockRequest.get).toHaveBeenCalledWith('x-upload-session');
        expect(AttachmentService.signUploadUrl).toHaveBeenCalledWith(
          'admin-123',
          expect.any(Object),
          '01H2QWERTY123456',
        );
      });

      it('ignores non-string suggested_prefix', async () => {
        mockRequest.body = {
          content_type: 'image/png',
          filename: 'x.png',
          suggested_prefix: 123,
        } as any;

        (AttachmentService.signUploadUrl as jest.Mock).mockResolvedValue({
          object_key: 'staging/admin-123/x.png',
          signed_url: 'https://s3.aws.com/signed-url',
          max_bytes: 10485760,
          expires_at: '2025-01-01T00:00:00Z',
        });

        await AdminAttachmentController.signUpload(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

        expect(AttachmentService.signUploadUrl).toHaveBeenCalledWith(
          'admin-123',
          expect.objectContaining({ suggested_prefix: undefined }),
          undefined,
        );
      });
    });

    describe('errors', () => {
      it('returns 400 on service error', async () => {
        mockRequest.body = { content_type: 'image/png', filename: 'x.png' };

        (AttachmentService.signUploadUrl as jest.Mock).mockRejectedValue(
          new Error('S3 service unavailable'),
        );

        await AdminAttachmentController.signUpload(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

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
        mockRequest.body = { content_type: 'image/png', filename: 'x.png' };

        (AttachmentService.signUploadUrl as jest.Mock).mockRejectedValue(
          'string error',
        );

        await AdminAttachmentController.signUpload(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

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
        mockRequest.user = undefined;

        await AdminAttachmentController.signView(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'forbidden' });
        expect(log.warn).toHaveBeenCalledWith(
          '[signView] forbidden: missing/invalid user role',
          'no-user',
        );
      });

      it('returns 403 when user role is not ADMIN', async () => {
        mockRequest.user = {
          role: 'user' as unknown as Role,
          userId: 'user-123',
          sub: 'user-123',
        } as any;

        await AdminAttachmentController.signView(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'forbidden' });
      });
    });

    describe('validation', () => {
      it('returns 400 when object_key is missing', async () => {
        mockRequest.body = {};

        await AdminAttachmentController.signView(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

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
        mockRequest.body = { object_key: 123 } as any;

        await AdminAttachmentController.signView(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'object_key is required (string)',
        });
      });

      it('returns 400 on missing body', async () => {
        mockRequest.body = undefined;

        await AdminAttachmentController.signView(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'object_key is required (string)',
        });
      });
    });

    describe('key authorization', () => {
      it('allows keys starting with "questions/"', async () => {
        mockRequest.body = { object_key: 'questions/two-sum/diagram.png' };

        (AttachmentService.signViewUrl as jest.Mock).mockResolvedValue({
          object_key: 'questions/two-sum/diagram.png',
          signed_url: 'https://s3.aws.com/signed-url',
          expires_at: '2025-01-01T00:00:00Z',
        });

        await AdminAttachmentController.signView(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

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
        mockRequest.body = { object_key: 'staging/admin-123/test.png' };

        (AttachmentService.signViewUrl as jest.Mock).mockResolvedValue({
          object_key: 'staging/admin-123/test.png',
          signed_url: 'https://s3.aws.com/signed-url',
          expires_at: '2025-01-01T00:00:00Z',
        });

        await AdminAttachmentController.signView(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

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
        mockRequest.body = { object_key: 'staging/other-admin/test.png' };

        await AdminAttachmentController.signView(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

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
        mockRequest.body = { object_key: 'private/secret.txt' };

        await AdminAttachmentController.signView(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'key_not_allowed' });
      });

      it('rejects empty staging prefix without user ID', async () => {
        mockRequest.body = { object_key: 'staging//test.png' };

        await AdminAttachmentController.signView(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'key_not_allowed' });
      });
    });

    describe('success', () => {
      it('signs view URL with minimal options', async () => {
        mockRequest.body = { object_key: 'questions/test/file.pdf' };

        (AttachmentService.signViewUrl as jest.Mock).mockResolvedValue({
          object_key: 'questions/test/file.pdf',
          signed_url: 'https://s3.aws.com/signed-url',
          expires_at: '2025-01-01T00:00:00Z',
        });

        await AdminAttachmentController.signView(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

        expect(AttachmentService.signViewUrl).toHaveBeenCalledWith(
          'questions/test/file.pdf',
          {},
        );
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({ object_key: 'questions/test/file.pdf' }),
        );
      });

      it('includes as_attachment when true', async () => {
        mockRequest.body = {
          object_key: 'questions/test/file.pdf',
          as_attachment: true,
        };

        (AttachmentService.signViewUrl as jest.Mock).mockResolvedValue({
          object_key: 'questions/test/file.pdf',
          signed_url: 'https://s3.aws.com/signed-url',
          expires_at: '2025-01-01T00:00:00Z',
        });

        await AdminAttachmentController.signView(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

        expect(AttachmentService.signViewUrl).toHaveBeenCalledWith(
          'questions/test/file.pdf',
          { asAttachment: true },
        );
      });

      it('does not include as_attachment when false', async () => {
        mockRequest.body = {
          object_key: 'questions/test/file.pdf',
          as_attachment: false,
        };

        (AttachmentService.signViewUrl as jest.Mock).mockResolvedValue({
          object_key: 'questions/test/file.pdf',
          signed_url: 'https://s3.aws.com/signed-url',
          expires_at: '2025-01-01T00:00:00Z',
        });

        await AdminAttachmentController.signView(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

        expect(AttachmentService.signViewUrl).toHaveBeenCalledWith(
          'questions/test/file.pdf',
          {},
        );
      });

      it('passes filename option', async () => {
        mockRequest.body = {
          object_key: 'questions/test/file.pdf',
          filename: 'custom.pdf',
        };

        (AttachmentService.signViewUrl as jest.Mock).mockResolvedValue({
          object_key: 'questions/test/file.pdf',
          signed_url: 'https://s3.aws.com/signed-url',
          expires_at: '2025-01-01T00:00:00Z',
        });

        await AdminAttachmentController.signView(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

        expect(AttachmentService.signViewUrl).toHaveBeenCalledWith(
          'questions/test/file.pdf',
          { filename: 'custom.pdf' },
        );
      });

      it('passes content_type_hint option', async () => {
        mockRequest.body = {
          object_key: 'questions/test/file.bin',
          content_type_hint: 'application/octet-stream',
        };

        (AttachmentService.signViewUrl as jest.Mock).mockResolvedValue({
          object_key: 'questions/test/file.bin',
          signed_url: 'https://s3.aws.com/signed-url',
          expires_at: '2025-01-01T00:00:00Z',
        });

        await AdminAttachmentController.signView(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

        expect(AttachmentService.signViewUrl).toHaveBeenCalledWith(
          'questions/test/file.bin',
          { contentTypeHint: 'application/octet-stream' },
        );
      });

      it('passes all options when provided', async () => {
        mockRequest.body = {
          object_key: 'questions/test/file.pdf',
          as_attachment: true,
          filename: 'download.pdf',
          content_type_hint: 'application/pdf',
        };

        (AttachmentService.signViewUrl as jest.Mock).mockResolvedValue({
          object_key: 'questions/test/file.pdf',
          signed_url: 'https://s3.aws.com/signed-url',
          expires_at: '2025-01-01T00:00:00Z',
        });

        await AdminAttachmentController.signView(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

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
        mockRequest.body = {
          object_key: 'questions/test/file.pdf',
          as_attachment: 'true',
        } as any;

        (AttachmentService.signViewUrl as jest.Mock).mockResolvedValue({
          object_key: 'questions/test/file.pdf',
          signed_url: 'https://s3/aws.com/signed-url',
          expires_at: '2025-01-01T00:00:00Z',
        });

        await AdminAttachmentController.signView(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

        expect(AttachmentService.signViewUrl).toHaveBeenCalledWith(
          'questions/test/file.pdf',
          {},
        );
      });

      it('ignores non-string filename', async () => {
        mockRequest.body = {
          object_key: 'questions/test/file.pdf',
          filename: 123,
        } as any;

        (AttachmentService.signViewUrl as jest.Mock).mockResolvedValue({
          object_key: 'questions/test/file.pdf',
          signed_url: 'https://s3/aws.com/signed-url',
          expires_at: '2025-01-01T00:00:00Z',
        });

        await AdminAttachmentController.signView(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

        expect(AttachmentService.signViewUrl).toHaveBeenCalledWith(
          'questions/test/file.pdf',
          {},
        );
      });

      it('ignores non-string content_type_hint', async () => {
        mockRequest.body = {
          object_key: 'questions/test/file.pdf',
          content_type_hint: 123,
        } as any;

        (AttachmentService.signViewUrl as jest.Mock).mockResolvedValue({
          object_key: 'questions/test/file.pdf',
          signed_url: 'https://s3/aws.com/signed-url',
          expires_at: '2025-01-01T00:00:00Z',
        });

        await AdminAttachmentController.signView(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

        expect(AttachmentService.signViewUrl).toHaveBeenCalledWith(
          'questions/test/file.pdf',
          {},
        );
      });
    });

    describe('errors', () => {
      it('maps NotFound to 404', async () => {
        mockRequest.body = { object_key: 'questions/missing/file.pdf' };

        (AttachmentService.signViewUrl as jest.Mock).mockRejectedValue(
          new Error('NotFound: Object does not exist'),
        );

        await AdminAttachmentController.signView(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

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
        mockRequest.body = { object_key: 'questions/test/file.pdf' };

        (AttachmentService.signViewUrl as jest.Mock).mockRejectedValue(
          new Error('Invalid request'),
        );

        await AdminAttachmentController.signView(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

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
        mockRequest.body = { object_key: 'questions/test/file.pdf' };

        (AttachmentService.signViewUrl as jest.Mock).mockRejectedValue(
          new Error(''),
        );

        await AdminAttachmentController.signView(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'unknown_error' });
      });

      it('handles non-Error exceptions (string)', async () => {
        mockRequest.body = { object_key: 'questions/test/file.pdf' };

        (AttachmentService.signViewUrl as jest.Mock).mockRejectedValue(
          'string error',
        );

        await AdminAttachmentController.signView(
          mockRequest as AuthRequest,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'string error' });
      });
    });
  });
});
