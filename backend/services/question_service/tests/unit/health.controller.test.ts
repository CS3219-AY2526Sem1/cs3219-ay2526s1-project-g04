// tests/unit/health.controller.test.ts
import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';
import type { Request, Response } from 'express';

import * as HealthController from '../../src/controllers/HealthController.js';
import * as prismaMod from '../../src/repositories/prisma.js';
import * as logger from '../../src/utils/logger.js';
import * as s3mod from '../../src/utils/s3.js';
import { HeadBucketCommand } from '@aws-sdk/client-s3';

// We don't need the real AWS constructor work
jest.mock('@aws-sdk/client-s3');

let jsonMock: jest.Mock;
let statusMock: jest.Mock;
let mockRequest: Partial<Request>;
let mockResponse: Partial<Response>;
let originalEnv: NodeJS.ProcessEnv;

// Spies (installed in beforeEach)
let spyExec: jest.SpiedFunction<any>;
let spySend: jest.SpiedFunction<any>;
let infoSpy: jest.SpiedFunction<any>;
let warnSpy: jest.SpiedFunction<any>;
let errorSpy: jest.SpiedFunction<any>;

beforeEach(() => {
  jest.clearAllMocks();

  // clone env so tests can toggle NODE_ENV safely
  originalEnv = process.env;
  process.env = { ...originalEnv };

  jsonMock = jest.fn();
  statusMock = jest.fn().mockReturnThis();

  mockResponse = {
    json: jsonMock,
    status: statusMock,
  };

  mockRequest = {
    ip: '127.0.0.1',
    get: jest.fn().mockReturnValue('test-user-agent'),
  };

  // IMPORTANT: Spy on already-imported ESM modules (no hoisting issues)
  spyExec = jest.spyOn(prismaMod.prisma as any, '$executeRaw');
  spySend = jest.spyOn(s3mod.s3 as any, 'send');

  // logger spies so we can assert on structured logs
  infoSpy = jest.spyOn(logger.log, 'info').mockImplementation(jest.fn());
  warnSpy = jest.spyOn(logger.log, 'warn').mockImplementation(jest.fn());
  errorSpy = jest.spyOn(logger.log, 'error').mockImplementation(jest.fn());
});

afterEach(() => {
  process.env = originalEnv;

  spyExec.mockRestore();
  spySend.mockRestore();
  infoSpy.mockRestore();
  warnSpy.mockRestore();
  errorSpy.mockRestore();
});

describe('HealthController', () => {
  describe('healthz', () => {
    it('should return ok: true for liveness probe', async () => {
      await HealthController.healthz(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(jsonMock).toHaveBeenCalledWith({ ok: true });
      expect(infoSpy).toHaveBeenCalledWith(
        '[healthz] liveness probe',
        expect.objectContaining({
          ip: '127.0.0.1',
          ua: 'test-user-agent',
        }),
      );
    });

    it('should always return success regardless of dependencies', async () => {
      // Even if deps are down, liveness should still pass
      spyExec.mockRejectedValue(new Error('db down'));
      spySend.mockRejectedValue(new Error('s3 down'));

      await HealthController.healthz(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(statusMock).not.toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith({ ok: true });
    });
  });

  describe('readyz', () => {
    describe('all checks pass', () => {
      beforeEach(() => {
        spyExec.mockResolvedValue(1);
        spySend.mockResolvedValue({});
      });

      it('should return 200 when all dependencies are healthy', async () => {
        await HealthController.readyz(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(200);
        expect(jsonMock).toHaveBeenCalledWith({
          ok: true,
          checks: {
            db: { ok: true },
            s3: { ok: true },
          },
        });
      });

      it('should log ready status', async () => {
        await HealthController.readyz(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(infoSpy).toHaveBeenCalledWith(
          '[readyz] ready',
          expect.objectContaining({
            ip: '127.0.0.1',
            ua: 'test-user-agent',
            statusCode: 200,
            durationMs: expect.any(Number),
            checks: {
              db: { ok: true },
              s3: { ok: true },
            },
          }),
        );
      });

      it('should check DB with SELECT 1 query', async () => {
        await HealthController.readyz(
          mockRequest as Request,
          mockResponse as Response,
        );
        expect(spyExec).toHaveBeenCalled(); // prisma.$executeRaw`SELECT 1`
      });

      it('should check S3 bucket with HeadBucketCommand', async () => {
        await HealthController.readyz(
          mockRequest as Request,
          mockResponse as Response,
        );
        expect(spySend).toHaveBeenCalledWith(expect.any(HeadBucketCommand));
      });
    });

    describe('DB check fails', () => {
      beforeEach(() => {
        spyExec.mockRejectedValue(new Error('Connection refused'));
        spySend.mockResolvedValue({});
      });

      it('should return 503 when DB is down', async () => {
        await HealthController.readyz(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(503);
        expect(jsonMock).toHaveBeenCalledWith({
          ok: false,
          checks: {
            db: { ok: false, error: 'Connection refused' },
            s3: { ok: true },
          },
        });
      });

      it('should not leak error details in production', async () => {
        process.env['NODE_ENV'] = 'production';

        await HealthController.readyz(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(jsonMock).toHaveBeenCalledWith({
          ok: false,
          checks: {
            db: { ok: false },
            s3: { ok: true },
          },
        });
      });

      it('should log DB check failure', async () => {
        await HealthController.readyz(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(warnSpy).toHaveBeenCalledWith(
          '[readyz] db check failed',
          expect.objectContaining({
            ip: '127.0.0.1',
            ua: 'test-user-agent',
            error: 'Connection refused',
          }),
        );
      });

      it('should handle non-Error DB failures', async () => {
        spyExec.mockRejectedValueOnce('string error');

        await HealthController.readyz(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(503);
        expect(jsonMock).toHaveBeenCalledWith({
          ok: false,
          checks: expect.objectContaining({
            db: { ok: false, error: 'string error' },
          }),
        });
      });
    });

    describe('S3 check fails', () => {
      beforeEach(() => {
        spyExec.mockResolvedValue(1);
        spySend.mockRejectedValue(new Error('Bucket not found'));
      });

      it('should return 503 when S3 is down', async () => {
        await HealthController.readyz(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(503);
        expect(jsonMock).toHaveBeenCalledWith({
          ok: false,
          checks: {
            db: { ok: true },
            s3: { ok: false, error: 'Bucket not found' },
          },
        });
      });

      it('should not leak S3 error details in production', async () => {
        process.env['NODE_ENV'] = 'production';

        await HealthController.readyz(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(jsonMock).toHaveBeenCalledWith({
          ok: false,
          checks: {
            db: { ok: true },
            s3: { ok: false },
          },
        });
      });

      it('should log S3 check failure', async () => {
        await HealthController.readyz(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(warnSpy).toHaveBeenCalledWith(
          '[readyz] s3 check failed',
          expect.objectContaining({
            ip: '127.0.0.1',
            ua: 'test-user-agent',
            bucket: s3mod.S3_BUCKET,
            error: 'Bucket not found',
          }),
        );
      });
    });

    describe('S3 bucket not configured', () => {
      it('should handle missing S3_BUCKET configuration', async () => {
        // Use an isolated module graph just for this branch so we can alter S3_BUCKET binding
        await jest.isolateModulesAsync(async () => {
          const prismaExecuteRaw = jest.fn().mockResolvedValue(1);
          const s3Send = jest.fn(); // won't be called because code short-circuits

          await jest.unstable_mockModule(
            '../../src/repositories/prisma.js',
            () => ({
              __esModule: true,
              prisma: { $executeRaw: prismaExecuteRaw },
            }),
          );

          await jest.unstable_mockModule('../../src/utils/s3.js', () => ({
            __esModule: true,
            s3: { send: s3Send },
            S3_BUCKET: '', // simulate not configured
          }));

          await jest.unstable_mockModule('../../src/utils/logger.js', () => ({
            __esModule: true,
            log: {
              info: infoSpy,
              warn: warnSpy,
              error: errorSpy,
              debug: jest.fn(),
            },
          }));

          await jest.unstable_mockModule('@aws-sdk/client-s3', () => ({
            __esModule: true,
            HeadBucketCommand: class {
              constructor(_args: any) {}
            },
          }));

          const Health = await import(
            '../../src/controllers/HealthController.js'
          );

          await Health.readyz(mockRequest as Request, mockResponse as Response);

          expect(statusMock).toHaveBeenCalledWith(503);
          expect(jsonMock).toHaveBeenCalledWith(
            expect.objectContaining({
              ok: false,
              checks: expect.objectContaining({
                s3: expect.objectContaining({
                  ok: false,
                  error: expect.stringMatching(/S3_BUCKET not configured/),
                }),
              }),
            }),
          );
        });
      });
    });

    describe('both checks fail', () => {
      beforeEach(() => {
        spyExec.mockRejectedValue(new Error('DB error'));
        spySend.mockRejectedValue(new Error('S3 error'));
      });

      it('should return 503 when all dependencies are down', async () => {
        await HealthController.readyz(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(statusMock).toHaveBeenCalledWith(503);
        expect(jsonMock).toHaveBeenCalledWith({
          ok: false,
          checks: {
            db: { ok: false, error: 'DB error' },
            s3: { ok: false, error: 'S3 error' },
          },
        });
      });

      it('should log not ready status', async () => {
        await HealthController.readyz(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(warnSpy).toHaveBeenCalledWith(
          '[readyz] not ready',
          expect.objectContaining({
            statusCode: 503,
            checks: {
              db: { ok: false, error: 'DB error' },
              s3: { ok: false, error: 'S3 error' },
            },
          }),
        );
      });
    });

    describe('timeout handling', () => {
      it('should timeout DB check after 1000ms', async () => {
        jest.useFakeTimers();
        spyExec.mockImplementation(() => new Promise(() => {})); // never resolves
        spySend.mockResolvedValue({});

        const p = HealthController.readyz(
          mockRequest as Request,
          mockResponse as Response,
        );
        jest.advanceTimersByTime(1000); // triggers db withTimeout
        await p;

        expect(statusMock).toHaveBeenCalledWith(503);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            checks: expect.objectContaining({
              db: expect.objectContaining({ ok: false, error: 'timeout' }),
            }),
          }),
        );

        jest.useRealTimers();
      });

      it('should timeout S3 check after 1500ms', async () => {
        jest.useFakeTimers();

        spyExec.mockResolvedValue(1);
        // never resolves → force timeout path
        spySend.mockImplementation(() => new Promise(() => {}));

        const p = HealthController.readyz(
          mockRequest as Request,
          mockResponse as Response,
        );

        // IMPORTANT: use the async timer helper so promise jobs flush correctly
        await jest.advanceTimersByTimeAsync(1501); // a hair past 1500ms

        await p;

        expect(statusMock).toHaveBeenCalledWith(503);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            checks: expect.objectContaining({
              s3: expect.objectContaining({ ok: false, error: 'timeout' }),
            }),
          }),
        );

        jest.useRealTimers();
      });

      describe('performance tracking', () => {
        it('should track duration of readiness check', async () => {
          spyExec.mockResolvedValue(1);
          spySend.mockResolvedValue({});

          const startTime = Date.now();
          await HealthController.readyz(
            mockRequest as Request,
            mockResponse as Response,
          );
          const endTime = Date.now();

          expect(infoSpy).toHaveBeenCalledWith(
            '[readyz] ready',
            expect.objectContaining({
              durationMs: expect.any(Number),
            }),
          );

          const payload = (infoSpy as jest.Mock).mock.calls[0][1];
          expect(payload.durationMs).toBeGreaterThanOrEqual(0);
          expect(payload.durationMs).toBeLessThanOrEqual(
            endTime - startTime + 100,
          );
        });
      });

      describe('request metadata', () => {
        it('should capture IP and user agent', async () => {
          spyExec.mockResolvedValue(1);
          spySend.mockResolvedValue({});

          mockRequest.ip = '192.168.1.1';
          (mockRequest.get as jest.Mock).mockReturnValue('Custom-Agent/1.0');

          await HealthController.readyz(
            mockRequest as Request,
            mockResponse as Response,
          );

          expect(infoSpy).toHaveBeenCalledWith(
            '[readyz] ready',
            expect.objectContaining({
              ip: '192.168.1.1',
              ua: 'Custom-Agent/1.0',
            }),
          );
        });
      });
    });
  });
});
